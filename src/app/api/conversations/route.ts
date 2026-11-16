import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { listConversations, findOrCreateConversation } from "@/server/services/conversation-service";
import { User, Booking } from "@/models";

export const GET = handle(async () => {
  const session = await requireUser();
  const conversations = await listConversations(session.user.id);
  return ok(conversations);
});

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  const body = await readJson<{ userId?: string; bookingId?: string }>(req);

  if (body.bookingId) {
    if (!/^[0-9a-fA-F]{24}$/.test(body.bookingId)) throw new ApiError(400, "Invalid booking id.");
    const booking = await Booking.findById(body.bookingId);
    if (!booking) throw new ApiError(404, "Booking not found.");
    if (booking.customerId !== session.user.id && booking.providerId !== session.user.id) {
      throw new ApiError(403, "Not your booking.");
    }
    const conversationId = String(booking.conversationId ?? "");
    if (conversationId) return ok({ conversationId });
    return ok({ conversationId: null });
  }

  if (body.userId) {
    if (!/^[0-9a-fA-F]{24}$/.test(body.userId)) throw new ApiError(400, "Invalid user id.");
    const other = await User.findById(body.userId).select("banned");
    if (!other || other.banned) throw new ApiError(404, "User unavailable.");
    const conversationId = await findOrCreateConversation(session.user.id, body.userId, null);
    return ok({ conversationId }, 201);
  }

  throw new ApiError(400, "Provide userId or bookingId.");
});
