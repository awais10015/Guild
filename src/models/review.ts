import { Schema, model, models, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    customerId: { type: String, required: true, index: true },
    providerId: { type: String, required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", default: null },

    ratings: {
      overall: { type: Number, required: true, min: 1, max: 5 },
      quality: { type: Number, required: true, min: 1, max: 5 },
      professionalism: { type: Number, required: true, min: 1, max: 5 },
      communication: { type: Number, required: true, min: 1, max: 5 },
    },
    comment: { type: String, required: true },
    images: [
      new Schema(
        { url: String, publicId: { type: String, default: null } },
        { _id: false },
      ),
    ],

    providerReply: {
      body: { type: String, default: null },
      at: { type: Date, default: null },
    },

    moderation: {
      status: {
        type: String,
        enum: ["visible", "hidden", "flagged"],
        default: "visible",
        index: true,
      },
      reason: { type: String, default: null },
      by: { type: String, default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

reviewSchema.index({ providerId: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const Review = models.Review ?? model("Review", reviewSchema);
