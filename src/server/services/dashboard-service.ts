import { Booking, Favorite, ProviderProfile, Report, Review, Service, User, VerificationRequest, BookingDoc } from "@/models";

export interface StatusCount {
  status: string;
  count: number;
}

export async function customerStats(userId: string) {
  const byStatus = await Booking.aggregate<{ _id: string; count: number }>([
    { $match: { customerId: userId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const get = (s: string) => byStatus.find((b) => b._id === s)?.count ?? 0;
  const [favorites, reviews] = await Promise.all([
    Favorite.countDocuments({ customerId: userId }),
    Review.countDocuments({ customerId: userId }),
  ]);
  return {
    active: get("pending") + get("accepted") + get("quotation_sent") + get("confirmed") + get("in_progress"),
    completed: get("completed"),
    cancelled: get("cancelled") + get("rejected"),
    total: byStatus.reduce((s, b) => s + b.count, 0),
    favorites,
    reviews,
  };
}

export async function providerStats(userId: string) {
  const byStatus = await Booking.aggregate<{ _id: string; count: number }>([
    { $match: { providerId: userId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const get = (s: string) => byStatus.find((b) => b._id === s)?.count ?? 0;
  const [earningsAgg] = await Booking.aggregate<{ total: number }>([
    { $match: { providerId: userId, status: "completed", "pricing.amount": { $ne: null } } },
    { $group: { _id: null, total: { $sum: "$pricing.amount" } } },
  ]);
  const profile = await ProviderProfile.findOne({ userId }).select("rating stats").lean();
  const [services, pendingReviews] = await Promise.all([
    Service.countDocuments({ providerId: userId, isActive: true }),
    Review.countDocuments({ providerId: userId, "providerReply.body": null, "moderation.status": "visible" }),
  ]);
  return {
    totalBookings: byStatus.reduce((s, b) => s + b.count, 0),
    pending: get("pending"),
    accepted: get("accepted") + get("quotation_sent"),
    confirmed: get("confirmed") + get("in_progress"),
    completed: get("completed"),
    cancelled: get("cancelled") + get("rejected") + get("disputed"),
    earnings: earningsAgg?.total ?? 0,
    rating: profile?.rating?.average ?? 0,
    reviewCount: profile?.rating?.count ?? 0,
    views: profile?.stats?.profileViews ?? 0,
    completedJobs: profile?.stats?.completedJobs ?? 0,
    activeServices: services,
    pendingReplies: pendingReviews,
  };
}

export async function recentBookingsFor(userId: string, role: "customer" | "provider", limit = 6) {
  const filter = role === "customer" ? { customerId: userId } : { providerId: userId };
  return Booking.find(filter).sort({ createdAt: -1 }).limit(limit).populate("serviceId", "title").lean();
}

/* ---------------- admin ---------------- */

export async function adminStats() {
  const [users, providers, customers, verified, pendingVerification, bookings, reports, openReports, services] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "provider" }),
      User.countDocuments({ role: "customer" }),
      ProviderProfile.countDocuments({ "verification.status": "verified" }),
      VerificationRequest.countDocuments({ status: "pending" }),
      Booking.countDocuments({}),
      Report.countDocuments({}),
      Report.countDocuments({ status: { $in: ["open", "investigating"] } }),
      Service.countDocuments({ isActive: true }),
    ]);

  const bookingsByStatus = await Booking.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const bookingsPerDay = await Booking.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: new Date(Date.now() - 13 * 24 * 3600 * 1000) } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const topCategories = await Service.aggregate<{ _id: unknown; count: number; name: string | null }>([
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 6 },
    {
      $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" },
    },
    { $project: { count: 1, name: { $first: "$cat.name" } } },
  ]);

  return {
    users,
    providers,
    customers,
    verified,
    pendingVerification,
    bookings,
    reports,
    openReports,
    services,
    bookingsByStatus,
    bookingsPerDay,
    topCategories,
  };
}

export type AdminStats = Awaited<ReturnType<typeof adminStats>>;
export type BookingLean = BookingDoc;
