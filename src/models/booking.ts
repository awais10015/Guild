import { Schema, model, models, type InferSchemaType } from "mongoose";
import { BOOKING_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/constants";

const bookingSchema = new Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },

    customerId: { type: String, required: true, index: true },
    providerId: { type: String, required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },

    description: { type: String, required: true },
    attachments: [
      new Schema(
        { url: String, publicId: { type: String, default: null } },
        { _id: false },
      ),
    ],

    /* exact address — visible ONLY to booking participants */
    address: {
      contactName: { type: String, required: true },
      contactPhone: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String, default: "" },
      streetAddress: { type: String, required: true },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true },

    pricing: {
      model: { type: String, default: "custom" },
      amount: { type: Number, default: null },
      currency: { type: String, default: "USD" },
    },

    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "pending",
      index: true,
    },
    /** true while status ∈ OPEN_BOOKING_STATUSES — drives the duplicate-request index */
    isOpen: { type: Boolean, default: true, index: true },

    statusHistory: [
      new Schema(
        {
          status: { type: String, required: true },
          byUserId: { type: String, required: true },
          at: { type: Date, default: Date.now },
          note: { type: String, default: "" },
        },
        { _id: false },
      ),
    ],

    activeQuotationId: { type: Schema.Types.ObjectId, ref: "Quotation", default: null },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });

/* database-level guarantee: one open request per customer per service */
bookingSchema.index(
  { customerId: 1, serviceId: 1, isOpen: 1 },
  { unique: true, partialFilterExpression: { isOpen: true } },
);

export type BookingDoc = InferSchemaType<typeof bookingSchema>;
export const Booking = models.Booking ?? model("Booking", bookingSchema);

export function isOpenStatus(status: string): boolean {
  return (OPEN_BOOKING_STATUSES as string[]).includes(status);
}
