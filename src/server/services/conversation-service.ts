import { Conversation, Message, User } from "@/models";
import { ApiError } from "@/lib/api";
import { Types } from "mongoose";

export function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function findOrCreateConversation(
  userA: string,
  userB: string,
  bookingId: string | null = null,
): Promise<string> {
  if (userA === userB) throw new ApiError(400, "Cannot start a conversation with yourself.");
  const [p1, p2] = normalizePair(userA, userB);
  const existing = await Conversation.findOne({ participants: [p1, p2], bookingId: bookingId ?? null });
  if (existing) return String(existing._id);
  try {
    const conv = await Conversation.create({
      participants: [p1, p2],
      bookingId: bookingId ?? null,
      unread: {},
    });
    return String(conv._id);
  } catch (err) {
    // unique index race — fetch the winner
    const conv = await Conversation.findOne({ participants: [p1, p2], bookingId: bookingId ?? null });
    if (conv) return String(conv._id);
    throw err;
  }
}

export interface ConversationListItem {
  _id: string;
  partner: { id: string; name: string; image: string | null; role: string };
  bookingId: string | null;
  lastMessage: { body: string; senderId: string | null; at: Date | null };
  unread: number;
}

export async function listConversations(userId: string): Promise<ConversationListItem[]> {
  const convs = await Conversation.find({ participants: userId })
    .sort({ "lastMessage.at": -1, updatedAt: -1 })
    .limit(50)
    .lean();

  const partnerIds = [
    ...new Set(
      convs.flatMap((c) => (c.participants as string[]).filter((p) => p !== userId)),
    ),
  ];
  const users = await User.find({ _id: { $in: partnerIds } })
    .select("name image role")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return convs.map((c) => {
    const partnerId = (c.participants as string[]).find((p) => p !== userId) ?? "";
    const u = userMap.get(partnerId);
    const unreadMap = (c.unread ?? {}) as Record<string, number>;
    return {
      _id: String(c._id),
      partner: {
        id: partnerId,
        name: u?.name ?? "User",
        image: (u?.image as string | null) ?? null,
        role: u?.role ?? "customer",
      },
      bookingId: c.bookingId ? String(c.bookingId) : null,
      lastMessage: {
        body: c.lastMessage?.body ?? "",
        senderId: (c.lastMessage?.senderId as string | null) ?? null,
        at: (c.lastMessage?.at as Date | null) ?? null,
      },
      unread: Number(unreadMap[userId] ?? 0),
    };
  });
}

export async function assertParticipant(conversationId: string, userId: string) {
  if (!Types.ObjectId.isValid(conversationId)) throw new ApiError(400, "Invalid conversation id.");
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new ApiError(404, "Conversation not found.");
  if (!(conv.participants as string[]).includes(userId)) {
    throw new ApiError(403, "You are not part of this conversation.");
  }
  return conv;
}

export async function getMessages(conversationId: string, userId: string, limit = 100) {
  await assertParticipant(conversationId, userId);
  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  return messages.map((m) => ({
    _id: String(m._id),
    senderId: m.senderId as string,
    type: m.type as string,
    body: (m.body as string) ?? "",
    attachment: (m.attachment as { url: string } | null) ?? null,
    createdAt: m.createdAt as Date,
  }));
}
