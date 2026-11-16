import { Message, Conversation } from "@/models";
import { ApiError } from "@/lib/api";
import { assertParticipant } from "@/server/services/conversation-service";
import { triggerToConversation, triggerToUser } from "@/lib/pusher";

export interface ChatMessagePayload {
  _id: string;
  conversationId: string;
  senderId: string;
  type: string;
  body: string;
  attachment: { url: string } | null;
  createdAt: string;
}

/**
 * Persist a chat message, update the conversation (lastMessage + unread counter)
 * and fan out realtime events through Pusher:
 * - `message:new` on the conversation channel (both participants)
 * - `conversation:update` + ephemeral `notification:new` on the partner's user channel
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: { type: "text" | "image"; body: string; attachment: { url: string; publicId?: string | null } | null },
): Promise<ChatMessagePayload> {
  const conv = await assertParticipant(conversationId, senderId);
  const clean = input.body.slice(0, 4000).trim();
  if (!clean && !input.attachment) throw new ApiError(422, "Message is empty.");

  const now = new Date();
  const doc = await Message.create({
    conversationId,
    senderId,
    type: input.type,
    body: clean,
    attachment: input.attachment
      ? {
          url: input.attachment.url.slice(0, 600),
          publicId: input.attachment.publicId ? String(input.attachment.publicId).slice(0, 200) : null,
        }
      : null,
    readBy: [senderId],
  });

  const participants = (conv.participants as string[]).map(String);
  const others = participants.filter((p) => p !== senderId);
  const unreadPath = `unread.${others[0]}`;
  await Conversation.updateOne(
    { _id: conv._id },
    {
      $set: { lastMessage: { body: input.type === "image" ? "📷 Photo" : clean, senderId, at: now } },
      $inc: { [unreadPath]: 1 },
    },
  );

  const payload: ChatMessagePayload = {
    _id: String(doc._id),
    conversationId,
    senderId,
    type: input.type,
    body: clean,
    attachment: input.attachment ? { url: input.attachment.url.slice(0, 600) } : null,
    createdAt: now.toISOString(),
  };

  void triggerToConversation(conversationId, "message:new", { conversationId, message: payload });
  for (const other of others) {
    void triggerToUser(other, "conversation:update", { conversationId, from: senderId });
    void triggerToUser(other, "notification:new", {
      id: `msg-${payload._id}`,
      type: "message_received",
      title: "New message",
      body: input.type === "image" ? "Sent a photo" : clean.slice(0, 80),
      data: { entityType: "conversation", entityId: conversationId },
      createdAt: now.toISOString(),
    });
  }

  return payload;
}

/** Reset the caller's unread counter and tell the other participant. */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await assertParticipant(conversationId, userId);
  await Conversation.updateOne({ _id: conversationId }, { $set: { [`unread.${userId}`]: 0 } });
  void triggerToConversation(conversationId, "message:read", { conversationId, userId });
}

/** Relay a typing indicator to the other participant (no persistence). */
export async function signalTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
  await assertParticipant(conversationId, userId);
  void triggerToConversation(conversationId, "typing", { conversationId, userId, isTyping, at: Date.now() });
}
