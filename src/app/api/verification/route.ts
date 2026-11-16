import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { verificationSchema } from "@/lib/validations";
import { VerificationRequest, ProviderProfile } from "@/models";
import { emitNotification } from "@/server/services/notification-service";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const POST = handle(async (req: NextRequest) => {
  const session = await requireRole("provider");
  if (!rateLimit(`verification:${clientIp(req)}`, 5, 300_000)) throw new ApiError(429, "Too many submissions.");

  const input = verificationSchema.parse(await readJson(req));
  const profile = await ProviderProfile.findOne({ userId: session.user.id });
  if (!profile) throw new ApiError(400, "Complete your provider profile first.");
  if (profile.verification?.status === "verified") throw new ApiError(400, "You are already verified.");
  if (profile.verification?.status === "pending") throw new ApiError(400, "Your request is already under review.");

  const pending = await VerificationRequest.findOne({ userId: session.user.id, status: "pending" });
  if (pending) throw new ApiError(400, "Your request is already under review.");

  const request = await VerificationRequest.create({
    providerProfileId: profile._id,
    userId: session.user.id,
    documents: input.documents,
    status: "pending",
    history: [{ status: "pending", byUserId: session.user.id, at: new Date(), note: "Submitted" }],
  });
  await ProviderProfile.updateOne({ _id: profile._id }, { $set: { "verification.status": "pending" } });

  await emitNotification({
    userId: session.user.id,
    type: "verification_update",
    title: "Verification request submitted",
    body: "An administrator will review your documents shortly.",
    data: { entityType: "provider", entityId: session.user.id },
  });

  return ok({ id: String(request._id) }, 201);
});

export const GET = handle(async () => {
  const session = await requireRole("provider");
  const requests = await VerificationRequest.find({ userId: session.user.id })
    .sort({ submittedAt: -1 })
    .limit(5)
    .lean();
  return ok(
    requests.map((r) => ({
      id: String(r._id),
      status: r.status,
      submittedAt: r.submittedAt,
      reviewedAt: r.reviewedAt,
      reviewNotes: r.reviewNotes,
      documents: r.documents,
    })),
  );
});
