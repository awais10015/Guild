import { Schema, model, models, type InferSchemaType } from "mongoose";

const customerProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    defaultPhone: { type: String, default: "" },
    address: {
      label: { type: String, default: "" },
      city: { type: String, default: "" },
      area: { type: String, default: "" },
      streetAddress: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { timestamps: true },
);

export type CustomerProfileDoc = InferSchemaType<typeof customerProfileSchema>;
export const CustomerProfile =
  models.CustomerProfile ?? model("CustomerProfile", customerProfileSchema);
