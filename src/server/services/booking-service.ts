import { Booking, Conversation, Message, Service, User, isOpenStatus } from "@/models";
import { ApiError } from "@/lib/api";
import { BOOKING_TRANSITIONS, STATUS_LABELS, type ActorRole, type BookingStatus } from "@/lib/constants";
import { emitNotification } from "./notification-service";
import { findOrCreateConversation } from "./conversation-service";
import type * as S from "@/lib/validations";
import type { z } from "zod";

function bookingNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BK-${ymd}-${rand}`;
}

interface Actor {
  id: string;
  role: ActorRole;
}

/* ---------------- create ---------------- */

export async function createBooking(actor: Actor, input: z.infer<typeof S.bookingCreateSchema>) {
  if (actor.role !== "customer") throw new ApiError(403, "Only customers can request bookings.");

  const service = await Service.findById(input.serviceId);
  if (!service || !service.isActive) throw new ApiError(404, "Service not found or unavailable.");

  const providerId = service.providerId as string;
  if (providerId === actor.id) throw new ApiError(400, "You cannot book your own service.");

  const provider = await User.findById(providerId).select("name email banned");
  if (!provider || provider.banned) throw new ApiError(404, "Provider unavailable.");

  if (input.scheduledDate.getTime() < Date.now() - 60_000) {
    throw new ApiError(422, "Choose a future date for the booking.");
  }

  const conversationId = await findOrCreateConversation(actor.id, providerId, String(service._id));

  let booking;
  try {
    booking = await Booking.create({
      bookingNumber: bookingNumber(),
      customerId: actor.id,
      providerId,
      serviceId: service._id,
      description: input.description,
      attachments: input.attachments,
      address: input.address,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      pricing: { model: service.pricingModel, amount: service.pricingModel === "fixed" ? service.price : null, currency: "USD" },
      status: "pending",
      isOpen: true,
      statusHistory: [{ status: "pending", byUserId: actor.id, at: new Date(), note: "" }],
      conversationId,
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      throw new ApiError(409, "You already have an open request for this service.");
    }
    throw err;
  }

  await Service.updateOne({ _id: service._id }, { $inc: { "stats.bookings": 1 } });
  await Message.create({
    conversationId,
    senderId: actor.id,
    type: "system",
    body: `Booking ${booking.bookingNumber} requested for "${service.title}".`,
  });

  await emitNotification({
    userId: providerId,
    type: "booking_requested",
    title: "New booking request",
    body: `${actor.id === providerId ? "" : "A customer"} requested "${service.title}".`,
    data: { entityType: "booking", entityId: String(booking._id) },
    email: provider.email,
  });

  return booking;
}

/* ---------------- read ---------------- */

export interface BookingListItem {
  _id: unknown;
  bookingNumber: string;
  status: string;
  scheduledDate: Date;
  scheduledTime?: string | null;
  pricing: { model: string; amount: number | null; currency: string };
  serviceId: { title?: string; images?: { url: string }[] } | null;
  createdAt: Date;
}

export async function listBookings(actor: Actor, status?: BookingStatus): Promise<BookingListItem[]> {
  const filter: Record<string, unknown> =
    actor.role === "customer" ? { customerId: actor.id } : { providerId: actor.id };
  if (status) filter.status = status;
  return (await Booking.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate<{ serviceId: { title: string; images: { url: string }[] } | null }>("serviceId", "title images pricingModel price")
    .lean()) as unknown as BookingListItem[];
}

export async function getBooking(actor: Actor, bookingId: string) {
  if (!/^[0-9a-fA-F]{24}$/.test(bookingId)) throw new ApiError(400, "Invalid booking id.");
  const booking = await Booking.findById(bookingId)
    .populate("serviceId", "title images pricingModel price description")
    .lean();
  if (!booking) throw new ApiError(404, "Booking not found.");
  const isParticipant =
    booking.customerId === actor.id || booking.providerId === actor.id || actor.role === "admin";
  if (!isParticipant) throw new ApiError(403, "You cannot view this booking.");
  return booking;
}

/* ---------------- transition ---------------- */

export async function transitionBooking(
  actor: Actor,
  bookingId: string,
  to: BookingStatus,
  note = "",
) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");

  const from = booking.status as BookingStatus;
  const allowedRoles = BOOKING_TRANSITIONS[from]?.[to];
  if (!allowedRoles) {
    throw new ApiError(400, `Cannot move a booking from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[to]}".`);
  }
  const isCustomer = actor.role === "customer" && booking.customerId === actor.id;
  const isProvider = actor.role === "provider" && booking.providerId === actor.id;
  const isAdmin = actor.role === "admin";
  const permitted = isAdmin || allowedRoles.includes(actor.role);
  const isParticipant = isCustomer || isProvider || isAdmin;
  if (!isParticipant || !permitted) {
    throw new ApiError(403, "You cannot perform this action on this booking.");
  }

  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: from },
    {
      $set: { status: to, isOpen: isOpenStatus(to) },
      $push: { statusHistory: { status: to, byUserId: actor.id, at: new Date(), note } },
    },
    { new: true },
  );
  if (!updated) throw new ApiError(409, "The booking was updated by someone else. Refresh and retry.");

  /* side effects */
  const [customer, provider] = await Promise.all([
    User.findById(booking.customerId).select("name email"),
    User.findById(booking.providerId).select("name email"),
  ]);

  const notifyCounterpart = async (type: Parameters<typeof emitNotification>[0]["type"], title: string, body: string, notifyProvider: boolean) => {
    const target = notifyProvider ? provider : customer;
    if (!target) return;
    await emitNotification({
      userId: String(target._id),
      type,
      title,
      body,
      data: { entityType: "booking", entityId: String(booking._id) },
      email: target.email,
    });
  };

  if (to === "accepted") {
    await notifyCounterpart("booking_accepted", "Booking request accepted", `${provider?.name ?? "The provider"} accepted your request ${booking.bookingNumber}.`, false);
  } else if (to === "rejected") {
    await notifyCounterpart("booking_rejected", "Booking request declined", `Your request ${booking.bookingNumber} was declined.`, false);
  } else if (to === "confirmed") {
    await notifyCounterpart("booking_status", "Booking confirmed", `Booking ${booking.bookingNumber} is confirmed.`, true);
  } else if (to === "in_progress") {
    await notifyCounterpart("booking_status", "Work started", `Work on booking ${booking.bookingNumber} has started.`, false);
  } else if (to === "completed") {
    await ProviderJobDone(booking.providerId as string);
    await notifyCounterpart("booking_status", "Job completed", `Booking ${booking.bookingNumber} was marked completed. Leave a review!`, false);
  } else if (to === "cancelled" || to === "disputed") {
    const other = isCustomer ? provider : customer;
    if (other) {
      await emitNotification({
        userId: String(other._id),
        type: "booking_status",
        title: `Booking ${to}`,
        body: `Booking ${booking.bookingNumber} was ${to}. ${note}`,
        data: { entityType: "booking", entityId: String(booking._id) },
        email: other.email,
      });
    }
  }

  return updated;
}

async function ProviderJobDone(providerId: string) {
  const { ProviderProfile } = await import("@/models");
  await ProviderProfile.updateOne({ userId: providerId }, { $inc: { "stats.completedJobs": 1 } });
}

/* ---------------- conversation fetch helper for pages ---------------- */

export async function bookingConversationId(bookingId: string): Promise<string | null> {
  const b = await Booking.findById(bookingId).select("conversationId").lean();
  return (b?.conversationId as string | null) ?? null;
}

export { Conversation };
