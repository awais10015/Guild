import { Schema, model, models, type InferSchemaType } from "mongoose";

const professionSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    keywords: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type ProfessionDoc = InferSchemaType<typeof professionSchema>;
export const Profession =
  models.Profession ?? model("Profession", professionSchema);
