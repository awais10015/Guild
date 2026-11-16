import { Schema, model, models, type InferSchemaType } from "mongoose";

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: String, required: true },
    type: { type: String, enum: ["text", "image", "system"], default: "text" },
    body: { type: String, default: "" },
    attachment: new Schema(
      { url: { type: String, required: true }, publicId: { type: String, default: null } },
      { _id: false },
    ),
    readBy: { type: [String], default: [] },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema>;
export const Message = models.Message ?? model("Message", messageSchema);
