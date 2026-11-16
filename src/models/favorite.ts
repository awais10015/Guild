import { Schema, model, models, type InferSchemaType } from "mongoose";

const favoriteSchema = new Schema(
  {
    customerId: { type: String, required: true },
    providerId: { type: String, required: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ customerId: 1, providerId: 1 }, { unique: true });

export type FavoriteDoc = InferSchemaType<typeof favoriteSchema>;
export const Favorite = models.Favorite ?? model("Favorite", favoriteSchema);
