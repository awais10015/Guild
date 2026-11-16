import { Schema, model, models, type InferSchemaType } from "mongoose";

const quotationSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    providerId: { type: String, required: true, index: true },
    customerId: { type: String, required: true },

    items: [
      new Schema(
        {
          label: { type: String, required: true },
          amount: { type: Number, required: true },
        },
        { _id: false },
      ),
    ],
    totalAmount: { type: Number, required: true },
    laborHours: { type: Number, default: null },
    note: { type: String, default: "" },
    validUntil: { type: Date, required: true },

    status: {
      type: String,
      enum: ["sent", "accepted", "declined", "expired", "superseded"],
      default: "sent",
      index: true,
    },
  },
  { timestamps: true },
);

quotationSchema.index({ bookingId: 1, status: 1 });
quotationSchema.index({ providerId: 1, createdAt: -1 });

export type QuotationDoc = InferSchemaType<typeof quotationSchema>;
export const Quotation = models.Quotation ?? model("Quotation", quotationSchema);
