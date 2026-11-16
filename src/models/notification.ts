import { Schema, model, models, type InferSchemaType } from "mongoose";
import { NOTIFICATION_TYPES } from "@/lib/constants";

const notificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const Notification =
  models.Notification ?? model("Notification", notificationSchema);
