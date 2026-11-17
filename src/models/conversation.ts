import { Schema, model, models, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    /** Sorted `userId:userId` — uniqueness is per pair + booking, not per participant. */
    pairKey: { type: String, required: true },
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

/* one thread per sorted pair and booking context (null = profile DM) */
conversationSchema.index({ pairKey: 1, bookingId: 1 }, { unique: true });
conversationSchema.index({ participants: 1 });

export type ConversationDoc = InferSchemaType<typeof conversationSchema>;
export const Conversation =
  models.Conversation ?? model("Conversation", conversationSchema);
