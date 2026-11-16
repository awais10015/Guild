import { Schema, model, models, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    participants: { type: [String], required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },

    lastMessage: {
      body: { type: String, default: "" },
      senderId: { type: String, default: null },
      at: { type: Date, default: null },
    },

    unread: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

/* one conversation per pair (bookingId null) and per (pair, booking) */
conversationSchema.index({ participants: 1, bookingId: 1 }, { unique: true });

export type ConversationDoc = InferSchemaType<typeof conversationSchema>;
export const Conversation =
  models.Conversation ?? model("Conversation", conversationSchema);
