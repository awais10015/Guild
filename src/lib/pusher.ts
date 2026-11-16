import Pusher from "pusher";

/**
 * Server-side Pusher client. Realtime is fully powered by Pusher Channels:
 * - `private-user-<userId>`            → notification:new, conversation:update
 * - `private-conversation-<convId>`    → message:new, message:read, typing
 *
 * All triggers are best-effort: if Pusher is not configured or the REST call
 * fails, the app keeps working (data is always persisted first).
 */

let client: Pusher | null = null;

export function pusherEnabled(): boolean {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER
  );
}

function getClient(): Pusher | null {
  if (!pusherEnabled()) return null;
  if (!client) {
    client = new Pusher({
      appId: process.env.PUSHER_APP_ID as string,
      key: process.env.PUSHER_KEY as string,
      secret: process.env.PUSHER_SECRET as string,
      cluster: process.env.PUSHER_CLUSTER as string,
      useTLS: true,
    });
  }
  return client;
}

let warned = false;

async function safeTrigger(channels: string | string[], event: string, payload: unknown): Promise<void> {
  const pusher = getClient();
  if (!pusher) {
    if (!warned && process.env.NODE_ENV !== "test") {
      console.warn("[pusher] not configured — realtime events are skipped (set PUSHER_* env vars)");
      warned = true;
    }
    return;
  }
  try {
    await pusher.trigger(channels, event, payload);
  } catch (err) {
    console.error("[pusher] trigger failed:", event, err instanceof Error ? err.message : err);
  }
}

/** Fire an event on a user's private channel (notifications, conversation list refresh). */
export function triggerToUser(userId: string, event: string, payload: unknown): Promise<void> {
  return safeTrigger(`private-user-${userId}`, event, payload);
}

/** Fire an event on a conversation channel (both participants are subscribed). */
export function triggerToConversation(conversationId: string, event: string, payload: unknown): Promise<void> {
  return safeTrigger(`private-conversation-${conversationId}`, event, payload);
}

/** Authorize a subscription (used by /api/pusher/auth). */
export function authorizeChannel(socketId: string, channelName: string, presenceData?: { user_id: string; user_info: Record<string, unknown> }) {
  const pusher = getClient();
  if (!pusher) throw new Error("Pusher is not configured");
  return pusher.authorizeChannel(socketId, channelName, presenceData);
}

/** Channel names used by the auth endpoint and the client. */
export const channels = {
  user: (userId: string) => `private-user-${userId}`,
  /** Presence channel: carries chat events and reports who is online. */
  conversation: (conversationId: string) => `presence-conversation-${conversationId}`,
};
