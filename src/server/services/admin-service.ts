import { Category, Profession, ProviderProfile, Report, Review, User, VerificationRequest } from "@/models";
import { ApiError } from "@/lib/api";
import { slugify } from "@/lib/text";
import { emitNotification } from "./notification-service";
import { recalcProviderRating } from "./review-service";
import { getAuth } from "@/lib/auth";

/* ---------------- users ---------------- */

export async function listUsers(opts: { q?: string; role?: string; page?: number }) {
  const page = opts.page ?? 1;
  const limit = 15;
  const filter: Record<string, unknown> = {};
  if (opts.role && ["customer", "provider", "admin"].includes(opts.role)) filter.role = opts.role;
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("name email role image banned banReason emailVerified createdAt").lean(),
    User.countDocuments(filter),
  ]);
  const profileFlags = await ProviderProfile.find({ userId: { $in: users.map((u) => String(u._id)) } })
    .select("userId isSuspended verification.status")
    .lean();
  const flagMap = new Map(profileFlags.map((p) => [p.userId as string, p]));
  return {
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role as string,
      image: (u.image as string | null) ?? null,
      banned: !!u.banned,
      banReason: (u.banReason as string | null) ?? null,
      emailVerified: !!u.emailVerified,
      createdAt: u.createdAt as Date,
      providerSuspended: !!flagMap.get(String(u._id))?.isSuspended,
      verificationStatus: (flagMap.get(String(u._id))?.verification?.status as string) ?? null,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function banUser(adminId: string, userId: string, reason: string) {
  const headers = (await import("next/headers")).headers;
  const auth = await getAuth();
  await auth.api.banUser({ body: { userId, banReason: reason }, headers: await headers() });
  await emitNotification({
    userId,
    type: "announcement",
    title: "Account suspended",
    body: reason || "Your account has been suspended by an administrator.",
  });
  return { ok: true, adminId };
}

export async function unbanUser(userId: string) {
  const headers = (await import("next/headers")).headers;
  const auth = await getAuth();
  await auth.api.unbanUser({ body: { userId }, headers: await headers() });
  return { ok: true };
}

export async function setProviderSuspension(userId: string, suspended: boolean) {
  const res = await ProviderProfile.updateOne({ userId }, { $set: { isSuspended: suspended } });
  if (!res.matchedCount) throw new ApiError(404, "Provider profile not found.");
  return { ok: true };
}

/* ---------------- verification ---------------- */

export interface VerificationQueueItem {
  _id: unknown;
  userId: { name?: string; email?: string; image?: string | null } | null;
  status: string;
  submittedAt: Date | null;
  documents: { type: string; label: string; url: string; publicId?: string | null }[];
  history: { status: string; byUserId?: string; at: Date; note?: string }[];
}

export async function listVerificationQueue(status = "pending"): Promise<VerificationQueueItem[]> {
  return VerificationRequest.find({ status })
    .sort({ submittedAt: 1 })
    .limit(50)
    .populate<{ userId: { name?: string; email?: string; image?: string | null } | null }>("userId", "name email image")
    .lean<VerificationQueueItem[]>();
}

export async function decideVerification(
  adminId: string,
  requestId: string,
  decision: "approved" | "rejected",
  notes = "",
) {
  const request = await VerificationRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Verification request not found.");
  if (request.status !== "pending") throw new ApiError(400, "This request was already handled.");

  await VerificationRequest.updateOne(
    { _id: request._id },
    {
      $set: { status: decision, reviewedBy: adminId, reviewedAt: new Date(), reviewNotes: notes },
      $push: { history: { status: decision, byUserId: adminId, at: new Date(), note: notes } },
    },
  );
  await ProviderProfile.updateOne(
    { _id: request.providerProfileId },
    {
      $set: {
        "verification.status": decision === "approved" ? "verified" : "rejected",
        "verification.verifiedAt": decision === "approved" ? new Date() : null,
      },
    },
  );

  const admin = await User.findById(adminId).select("name");
  const provider = await User.findById(request.userId).select("email name");
  await emitNotification({
    userId: request.userId,
    type: "verification_update",
    title: decision === "approved" ? "You are now a verified professional" : "Verification update",
    body:
      decision === "approved"
        ? "Your documents were approved. A verified badge now appears on your profile."
        : `Your verification request was not approved. ${notes}`,
    data: { entityType: "provider", entityId: request.userId },
    email: provider?.email,
  });
  return { status: decision, admin: admin?.name ?? "admin" };
}

/* ---------------- reports ---------------- */

export async function listReports(status?: string) {
  const filter = status && status !== "all" ? { status } : {};
  const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(60).lean();
  const reporterIds = [...new Set(reports.map((r) => r.reporterId as string))];
  const reporters = await User.find({ _id: { $in: reporterIds } }).select("name email").lean();
  const map = new Map(reporters.map((u) => [String(u._id), u]));
  return reports.map((r) => ({
    ...r,
    _id: String(r._id),
    reporter: map.get(r.reporterId as string)?.name ?? "Unknown",
    reporterEmail: map.get(r.reporterId as string)?.email ?? "",
  }));
}

export async function handleReport(adminId: string, reportId: string, action: "investigating" | "resolved" | "dismissed", note = "") {
  const report = await Report.findById(reportId);
  if (!report) throw new ApiError(404, "Report not found.");
  await Report.updateOne(
    { _id: report._id },
    { $set: { status: action, handledBy: adminId, handledAt: new Date(), resolutionNote: note } },
  );
  return { ok: true };
}

/* ---------------- review moderation ---------------- */

export async function moderateReview(adminId: string, reviewId: string, action: "hide" | "unhide" | "flag", reason = "") {
  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, "Review not found.");
  const status = action === "hide" ? "hidden" : action === "flag" ? "flagged" : "visible";
  await Review.updateOne(
    { _id: review._id },
    { $set: { "moderation.status": status, "moderation.reason": reason, "moderation.by": adminId, "moderation.at": new Date() } },
  );
  await recalcProviderRating(review.providerId as string);
  return { ok: true };
}

/* ---------------- taxonomy ---------------- */

export async function createCategory(input: { name: string; icon: string; description?: string; order?: number; isActive?: boolean }) {
  const slug = slugify(input.name);
  if (await Category.exists({ slug })) throw new ApiError(409, "A category with this name already exists.");
  return Category.create({ ...input, slug, order: input.order ?? 0, isActive: input.isActive ?? true });
}

export async function updateCategory(id: string, input: Partial<{ name: string; icon: string; description: string; order: number; isActive: boolean }>) {
  const patch: Record<string, unknown> = { ...input };
  if (input.name) patch.slug = slugify(input.name);
  return Category.updateOne({ _id: id }, { $set: patch });
}

export async function deleteCategory(id: string) {
  const profCount = await Profession.countDocuments({ categoryId: id });
  if (profCount > 0) throw new ApiError(400, `This category has ${profCount} professions. Remove them first.`);
  await Category.deleteOne({ _id: id });
  return { ok: true };
}

export async function createProfession(input: { categoryId: string; name: string; keywords: string[]; isActive?: boolean }) {
  const slug = slugify(input.name);
  if (await Profession.exists({ slug })) throw new ApiError(409, "A profession with this name already exists.");
  return Profession.create({ ...input, slug, isActive: input.isActive ?? true });
}

export async function updateProfession(id: string, input: Partial<{ name: string; keywords: string[]; isActive: boolean; categoryId: string }>) {
  const patch: Record<string, unknown> = { ...input };
  if (input.name) patch.slug = slugify(input.name);
  return Profession.updateOne({ _id: id }, { $set: patch });
}

export async function deleteProfession(id: string) {
  const { Service, ProviderProfile } = await import("@/models");
  const used = await Service.countDocuments({ professionId: id });
  if (used > 0) throw new ApiError(400, `${used} services use this profession. Deactivate it instead.`);
  await ProviderProfile.updateMany({ professions: id }, { $pull: { professions: id } });
  await Profession.deleteOne({ _id: id });
  return { ok: true };
}
