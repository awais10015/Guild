"use client";

import { useEffect, useRef, useState } from "react";
import PusherClient, { type Channel, type PresenceChannel } from "pusher-js";
import { toast } from "sonner";

/**
 * Realtime layer — Pusher Channels (pusher-js).
 *
 * Channels:
 * - `private-user-<userId>`         → notification:new, conversation:update
 * - `private-conversation-<convId>` → message:new, message:read, typing
 *
 * If Pusher is not configured the app still works: data changes arrive on
 * refresh, and a one-time warning explains what to set.
 */

let client: PusherClient | null = null;
let warnedMissing = false;

export function realtimeEnabled(): boolean {
  return !!(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

export function getRealtime(): PusherClient | null {
  if (!realtimeEnabled()) {
    if (!warnedMissing && typeof window !== "undefined") {
      warnedMissing = true;
      console.warn("[realtime] Pusher is not configured — live updates disabled (set NEXT_PUBLIC_PUSHER_* env vars)");
    }
    return null;
  }
  if (!client) {
    client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY as string, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
      authEndpoint: "/api/pusher/auth",
      forceTLS: true,
    });
    client.connection.bind("state_change", ({ current }: { current: string }) => {
      if (current === "unavailable") {
        toast.warning("Realtime connection lost — reconnecting…", { id: "realtime-outage" });
      }
      if (current === "connected") {
        toast.dismiss("realtime-outage");
      }
    });
    /* debug handle for headless verification */
    (window as unknown as { __pusher?: PusherClient }).__pusher = client;
  }
  return client;
}

/** Subscribe once to a private channel and bind a handler for the given event. */
function useChannelEvent(
  channelName: string | null,
  event: string,
  handler: (data: unknown) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const pusher = getRealtime();
    if (!pusher || !channelName) return;
    const channel = pusher.subscribe(channelName);
    const bound = (data: unknown) => handlerRef.current(data);
    channel.bind(event, bound);
    return () => {
      channel.unbind(event, bound);
      pusher.unsubscribe(channelName);
    };
  }, [channelName, event]);
}

/** Live notifications + conversation-list refresh for the logged-in user. */
export function useUserChannel(
  userId: string,
  opts: { onNotification?: (n: Record<string, unknown>) => void; onConversationUpdate?: () => void } = {},
) {
  useChannelEvent(userId ? `private-user-${userId}` : null, "notification:new", (data) => {
    opts.onNotification?.(data as Record<string, unknown>);
  });
  useChannelEvent(userId ? `private-user-${userId}` : null, "conversation:update", () => {
    opts.onConversationUpdate?.();
  });
}

interface ConversationChannelHandlers {
  onMessage?: (data: { conversationId: string; message: Record<string, unknown> }) => void;
  onTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onRead?: (data: { conversationId: string; userId: string }) => void;
}

/**
 * Subscribe to a conversation presence channel. Returns the set of participant
 * ids that are currently connected, plus the channel handle.
 */
export function useConversationChannel(
  conversationId: string | null,
  handlers: ConversationChannelHandlers,
): { onlineIds: string[]; channel: Channel | null } {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const pusher = getRealtime();
    if (!pusher || !conversationId) {
      setOnlineIds([]);
      setChannel(null);
      return;
    }
    const channelName = `presence-conversation-${conversationId}`;
    const ch: PresenceChannel = pusher.subscribe(channelName) as PresenceChannel;
    setChannel(ch);

    const boundMessage = (data: unknown) => handlersRef.current.onMessage?.(data as never);
    const boundTyping = (data: unknown) => handlersRef.current.onTyping?.(data as never);
    const boundRead = (data: unknown) => handlersRef.current.onRead?.(data as never);
    ch.bind("message:new", boundMessage);
    ch.bind("typing", boundTyping);
    ch.bind("message:read", boundRead);

    const syncPresence = () => {
      const ids: string[] = [];
      ch.members.each((m: { id: string }) => ids.push(m.id));
      setOnlineIds(ids);
    };
    ch.bind("pusher:subscription_succeeded", syncPresence);
    ch.bind("pusher:member_added", syncPresence);
    ch.bind("pusher:member_removed", syncPresence);

    return () => {
      ch.unbind("message:new", boundMessage);
      ch.unbind("typing", boundTyping);
      ch.unbind("message:read", boundRead);
      ch.unbind("pusher:subscription_succeeded", syncPresence);
      ch.unbind("pusher:member_added", syncPresence);
      ch.unbind("pusher:member_removed", syncPresence);
      pusher.unsubscribe(channelName);
      setOnlineIds([]);
      setChannel(null);
    };
  }, [conversationId]);

  return { onlineIds, channel };
}
