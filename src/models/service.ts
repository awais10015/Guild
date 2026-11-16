import { Schema, model, models, type InferSchemaType } from "mongoose";

const serviceSchema = new Schema(
  {
    providerId: { type: String, required: true, index: true },
    providerProfileId: { type: Schema.Types.ObjectId, ref: "ProviderProfile", required: true },

    title: { type: String, required: true },
    description: { type: String, required: true },

    categoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    professionId: { type: Schema.Types.ObjectId, ref: "Profession", required: true, index: true },

    images: [
      new Schema(
        {
          url: { type: String, required: true },
          publicId: { type: String, default: null },
        },
        { _id: false },
      ),
    ],

    pricingModel: {
      type: String,
      enum: ["fixed", "hourly", "starting", "custom"],
      required: true,
    },
    price: { type: Number, default: null },
    currency: { type: String, default: "USD" },
    durationHours: { type: Number, default: null },

    usesProfileAreas: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },

    stats: {
      views: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

serviceSchema.index({ providerId: 1, isActive: 1 });
serviceSchema.index({ professionId: 1, isActive: 1, price: 1 });
serviceSchema.index({ categoryId: 1, isActive: 1 });
serviceSchema.index(
  { title: "text", description: "text" },
  { weights: { title: 5, description: 1 }, name: "service_text" },
);

export type ServiceDoc = InferSchemaType<typeof serviceSchema>;
export const Service = models.Service ?? model("Service", serviceSchema);
