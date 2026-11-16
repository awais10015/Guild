import { Booking, ProviderProfile, Review, User } from "@/models";
import { ApiError } from "@/lib/api";
import type * as S from "@/lib/validations";
import type { z } from "zod";
import { emitNotification } from "./notification-service";

/** Recompute a provider's aggregated rating from visible reviews. */
export async function recalcProviderRating(providerId: string): Promise<void> {
  const [agg] = await Review.aggregate<{ average: number; count: number }>([
    { $match: { providerId, "moderation.status": "visible" } },
    { $group: { _id: null, average: { $avg: "$ratings.overall" }, count: { $sum: 1 } } },
  ]);
  await ProviderProfile.updateOne(
    { userId: providerId },
    {
      "rating.average": agg ? Math.round(agg.average * 10) / 10 : 0,
      "rating.count": agg?.count ?? 0,
    },
  );
}

export async function submitReview(actor: { id: string; role: string }, input: z.infer<typeof S.reviewSchema>) {
  if (actor.role !== "customer") throw new ApiError(403, "Only customers can write reviews.");

  const booking = await Booking.findById(input.bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (booking.customerId !== actor.id) throw new ApiError(403, "You can only review your own bookings.");
  if (booking.status !== "completed") {
    throw new ApiError(400, "Reviews can only be submitted for completed bookings.");
  }

  try {
    const review = await Review.create({
      bookingId: booking._id,
      customerId: actor.id,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      ratings: {
        overall: input.overall,
        quality: input.quality,
        professionalism: input.professionalism,
        communication: input.communication,
      },
      comment: input.comment,
      images: input.images,
    });
    await recalcProviderRating(booking.providerId);

    const provider = await User.findById(booking.providerId).select("email");
    await emitNotification({
      userId: booking.providerId,
      type: "review_received",
      title: `New ${input.overall}-star review`,
      body: input.comment.slice(0, 120),
      data: { entityType: "provider", entityId: booking.providerId },
      email: provider?.email,
    });
    return review;
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      throw new ApiError(409, "You have already reviewed this booking.");
    }
    throw err;
  }
}

export async function replyToReview(actor: { id: string; role: string }, reviewId: string, body: string) {
  if (actor.role !== "provider") throw new ApiError(403, "Only providers can reply to reviews.");
  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, "Review not found.");
  if (review.providerId !== actor.id) throw new ApiError(403, "Not your review.");
  await Review.updateOne(
    { _id: review._id },
    { providerReply: { body, at: new Date() } },
  );
}

/** Can this customer write a review for this provider (completed booking without a review)? */
export async function eligibleBookingForReview(customerId: string, providerId: string) {
  const completed = await Booking.find({ customerId, providerId, status: "completed" })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("_id bookingNumber createdAt")
    .lean();
  if (completed.length === 0) return null;
  const reviewed = await Review.find({
    customerId,
    providerId,
    bookingId: { $in: completed.map((b) => b._id) },
  })
    .select("bookingId")
    .lean();
  const reviewedSet = new Set(reviewed.map((r) => String(r.bookingId)));
  return completed.find((b) => !reviewedSet.has(String(b._id))) ?? null;
}
