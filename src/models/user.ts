import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Better Auth owns this collection — this schema exists so domain code can
 * read/denormalize users with typing. Auth mutations always go through
 * Better Auth APIs (or explicitly server-side admin actions).
 */
const userSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String, default: null },
    role: {
      type: String,
      enum: ["customer", "provider", "admin"],
      default: "customer",
    },
    phone: { type: String, default: "" },
    banned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    banExpires: { type: Date, default: null },
  },
  { collection: "user", timestamps: true },
);

userSchema.index({ role: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = models.User ?? model("User", userSchema);
