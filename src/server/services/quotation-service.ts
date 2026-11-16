import mongoose, { Types } from "mongoose";
import { Booking, Quotation, Service, User } from "@/models";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { emitNotification } from "./notification-service";
import type * as S from "@/lib/validations";
import type { z } from "zod";

interface Actor {
  id: string;
  role: "customer" | "provider" | "admin";
}

/** Send a quotation as provider */
export async function sendQuotation(actor: Actor, input: z.infer<typeof S.quotationCreateSchema>) {
  if (actor.role !== "provider") throw new ApiError(403, "Only providers can send quotations.");

  const booking = await Booking.findById(input.bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (booking.providerId !== actor.id) throw new ApiError(403, "This is not your booking.");
  if (!["accepted", "quotation_sent"].includes(booking.status)) {
    throw new ApiError(400, "Quotations can only be sent while the request is accepted.");
  }

  const total = input.items.reduce((sum, item) => sum + item.amount, 0);
  const validUntil = new Date(Date.now() + input.validDays * 24 * 60 * 60 * 1000);

  /* supersede previous open quotations */
  await Quotation.updateMany(
    { bookingId: booking._id, status: "sent" },
    { $set: { status: "superseded" } },
  );

  const quotation = await Quotation.create({
    bookingId: booking._id,
    providerId: actor.id,
    customerId: booking.customerId,
    items: input.items,
    totalAmount: total,
    laborHours: input.laborHours ?? null,
    note: input.note ?? "",
    validUntil,
    status: "sent",
  });

  await Booking.updateOne(
    { _id: booking._id, status: { $in: ["accepted", "quotation_sent"] } },
    {
      $set: { status: "quotation_sent", activeQuotationId: quotation._id, isOpen: true },
      $push: { statusHistory: { status: "quotation_sent", byUserId: actor.id, at: new Date(), note: "" } },
    },
  );

  const customer = await User.findById(booking.customerId).select("email");
  await emitNotification({
    userId: booking.customerId,
    type: "quotation_received",
    title: "New quotation received",
    body: `A quotation of ${formatMoney(total)} was sent for booking ${booking.bookingNumber}.`,
    data: { entityType: "booking", entityId: String(booking._id) },
    email: customer?.email,
  });

  return quotation;
}

/** Accept/decline as customer (transactional on accept) */
export async function respondQuotation(actor: Actor, quotationId: string, action: "accepted" | "declined") {
  if (actor.role !== "customer") throw new ApiError(403, "Only customers can respond to quotations.");
  if (!Types.ObjectId.isValid(quotationId)) throw new ApiError(400, "Invalid quotation id.");

  const quotation = await Quotation.findById(quotationId);
  if (!quotation) throw new ApiError(404, "Quotation not found.");
  if (quotation.customerId !== actor.id) throw new ApiError(403, "This is not your quotation.");
  if (quotation.status !== "sent") throw new ApiError(400, `This quotation is already ${quotation.status}.`);
  if (quotation.validUntil.getTime() < Date.now()) {
    await Quotation.updateOne({ _id: quotation._id }, { $set: { status: "expired" } });
    throw new ApiError(400, "This quotation has expired.");
  }

  const booking = await Booking.findById(quotation.bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (booking.customerId !== actor.id) throw new ApiError(403, "This is not your booking.");

  if (action === "declined") {
    await Quotation.updateOne({ _id: quotation._id }, { $set: { status: "declined" } });
    const provider = await User.findById(booking.providerId).select("email");
    await emitNotification({
      userId: booking.providerId,
      type: "booking_status",
      title: "Quotation declined",
      body: `The customer declined your quotation for booking ${booking.bookingNumber}.`,
      data: { entityType: "booking", entityId: String(booking._id) },
      email: provider?.email,
    });
    return { status: "declined" as const };
  }

  /* accept: quotation + booking atomically (falls back to sequential ops) */
  const session = await mongoose.startSession().catch(() => null);
  try {
    if (session) {
      await session.withTransaction(async () => {
        const res = await Quotation.updateOne(
          { _id: quotation._id, status: "sent" },
          { $set: { status: "accepted" } },
          { session },
        );
        if (res.modifiedCount !== 1) throw new ApiError(409, "Quotation already handled.");
        await Quotation.updateMany(
          { bookingId: booking._id, _id: { $ne: quotation._id }, status: "sent" },
          { $set: { status: "superseded" } },
          { session },
        );
        const bookingRes = await Booking.updateOne(
          { _id: booking._id, status: "quotation_sent" },
          {
            $set: {
              status: "confirmed",
              isOpen: true,
              "pricing.amount": quotation.totalAmount,
              activeQuotationId: quotation._id,
            },
            $push: { statusHistory: { status: "confirmed", byUserId: actor.id, at: new Date(), note: "Quotation accepted" } },
          },
          { session },
        );
        if (bookingRes.modifiedCount !== 1) throw new ApiError(409, "Booking state changed. Refresh and retry.");
      });
    } else {
      /* standalone mongod without replica set — sequential fallback */
      const res = await Quotation.updateOne({ _id: quotation._id, status: "sent" }, { $set: { status: "accepted" } });
      if (res.modifiedCount !== 1) throw new ApiError(409, "Quotation already handled.");
      await Quotation.updateMany(
        { bookingId: booking._id, _id: { $ne: quotation._id }, status: "sent" },
        { $set: { status: "superseded" } },
      );
      await Booking.updateOne(
        { _id: booking._id, status: "quotation_sent" },
        {
          $set: { status: "confirmed", isOpen: true, "pricing.amount": quotation.totalAmount, activeQuotationId: quotation._id },
          $push: { statusHistory: { status: "confirmed", byUserId: actor.id, at: new Date(), note: "Quotation accepted" } },
        },
      );
    }
  } finally {
    await session?.endSession();
  }

  const service = await Service.findById(booking.serviceId).select("title");
  const provider = await User.findById(booking.providerId).select("email");
  await emitNotification({
    userId: booking.providerId,
    type: "quotation_accepted",
    title: "Quotation accepted",
    body: `The customer accepted your ${formatMoney(quotation.totalAmount)} quotation for "${service?.title ?? "the job"}". Booking is confirmed.`,
    data: { entityType: "booking", entityId: String(booking._id) },
    email: provider?.email,
  });

  return { status: "accepted" as const };
}

export async function listQuotationsForBooking(actor: Actor, bookingId: string) {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (booking.customerId !== actor.id && booking.providerId !== actor.id && actor.role !== "admin") {
    throw new ApiError(403, "Not your booking.");
  }
  return Quotation.find({ bookingId }).sort({ createdAt: -1 }).lean();
}
