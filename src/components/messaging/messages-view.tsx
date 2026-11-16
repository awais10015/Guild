"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { useConversationChannel, useUserChannel } from "@/lib/realtime";
import { ImageUploader, type UploadedImage } from "@/components/shared/image-uploader";
import { toast } from "sonner";

interface ConversationItem {
  _id: string;
  partner: { id: string; name: string; image: string | null; role: string };
  bookingId: string | null;
  lastMessage: { body: string; senderId: string | null; at: string | null };
  unread: number;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  type: string;
  body: string;
  attachment: { url: string } | null;
  createdAt: string;
}

export function MessagesView({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<UploadedImage[]>([]);
  const [typing, setTyping] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const selectedConv = conversations.find((c) => c._id === selected) ?? null;

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      if (json.ok) {
        setConversations(json.data);
        setLoaded(true);
        return json.data as ConversationItem[];
      }
    } catch {
      /* network hiccup — keep current list */
    }
    return [];
  }, []);

  const markRead = useCallback(async (conversationId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
    } catch {
      /* best-effort */
    }
    setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, unread: 0 } : c)));
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  /* open conversation: load history + mark read */
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/conversations/${selected}/messages`);
        const json = await res.json();
        if (!cancelled) {
          if (json.ok) {
            setMessages(json.data);
            requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
          } else {
            toast.error(json.error ?? "Could not load this conversation.");
          }
        }
      } catch {
        if (!cancelled) toast.error("Network error while loading messages.");
      }
    })();
    void markRead(selected);
    setTyping(false);
    return () => {
      cancelled = true;
    };
  }, [selected, markRead]);

  const { onlineIds } = useConversationChannel(selected, {
    onMessage: (data) => {
      const msg = data.message as unknown as ChatMessage;
      const isMine = msg.senderId === currentUserId;
      if (data.conversationId === selected) {
        setMessages((prev) => {
          const withoutTemp = prev.filter(
            (m) => !(m._id.startsWith("temp-") && m.senderId === msg.senderId && m.body === msg.body),
          );
          if (withoutTemp.some((m) => m._id === msg._id)) return withoutTemp;
          return [...withoutTemp, msg];
        });
        if (!isMine) void markRead(data.conversationId);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === data.conversationId
            ? {
                ...c,
                unread: isMine || data.conversationId === selected ? c.unread : c.unread + 1,
                lastMessage: {
                  body: msg.type === "image" ? "📷 Photo" : msg.body,
                  senderId: msg.senderId,
                  at: msg.createdAt,
                },
              }
            : c,
        ),
      );
    },
    onTyping: (data) => {
      if (data.conversationId !== selected || data.userId === currentUserId) return;
      setTyping(data.isTyping);
      if (data.isTyping) {
        if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
        typingStopTimer.current = setTimeout(() => setTyping(false), 3000);
      }
    },
    onRead: (data) => {
      if (data.userId !== currentUserId) {
        setConversations((prev) => prev.map((c) => (c._id === data.conversationId ? { ...c, unread: 0 } : c)));
      }
    },
  });

  useUserChannel(currentUserId, {
    onConversationUpdate: () => void loadConversations(),
  });

  async function send() {
    if (!selected) return;
    const text = input.trim();
    const att = attachment[0] ?? null;
    if (!text && !att) return;
    const temp: ChatMessage = {
      _id: `temp-${Date.now()}`,
      senderId: currentUserId,
      type: att ? "image" : "text",
      body: text,
      attachment: att ? { url: att.url } : null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    setInput("");
    setAttachment([]);
    setTyping(false);
    void fetch(`/api/conversations/${selected}/typing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isTyping: false }),
    });
    try {
      const res = await fetch(`/api/conversations/${selected}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: att ? "image" : "text",
          body: text,
          attachment: att ? { url: att.url, publicId: att.publicId ?? null } : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Message failed to send.");
      const saved = json.data as ChatMessage;
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m._id !== temp._id);
        if (withoutTemp.some((m) => m._id === saved._id)) return withoutTemp;
        return [...withoutTemp, saved];
      });
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== temp._id));
      setInput(text);
      setAttachment(att ? [att] : []);
      toast.error(err instanceof Error ? err.message : "Message failed to send.");
    }
  }

  function onInputChange(v: string) {
    setInput(v);
    if (!selected) return;
    const now = Date.now();
    if (now - lastTypingSent.current > 1200) {
      lastTypingSent.current = now;
      void fetch(`/api/conversations/${selected}/typing`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isTyping: true }),
      });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void fetch(`/api/conversations/${selected}/typing`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isTyping: false }),
      });
    }, 1600);
  }

  const partnerOnline = !!selectedConv && onlineIds.includes(selectedConv.partner.id);

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 overflow-hidden rounded-xl border bg-card md:grid-cols-[320px_1fr]">
      {/* conversation list */}
      <div className={cn("flex flex-col border-r", selected && "hidden md:flex")}>
        <div className="border-b p-4">
          <h2 className="font-semibold">Messages</h2>
          <p className="text-xs text-muted-foreground">Conversations with your contacts</p>
        </div>
        <div className="scrollbar-thin max-h-full flex-1 overflow-y-auto">
          {loaded && conversations.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet. Book a service or message a professional to start chatting.
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelected(c._id)}
              className={cn(
                "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-muted",
                selected === c._id && "bg-muted",
              )}
            >
              <Avatar className="h-10 w-10">
                {c.partner.image ? <AvatarImage src={c.partner.image} alt={c.partner.name} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary">{initials(c.partner.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{c.partner.name}</span>
                  {c.lastMessage?.at && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastMessage.at)}</span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {c.lastMessage?.senderId === currentUserId ? "You: " : ""}
                  {c.lastMessage?.body ?? "No messages yet"}
                </p>
              </div>
              {c.unread > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* chat window */}
      <div className={cn("flex min-h-0 flex-col", !selected && "hidden md:flex")}>
        {!selectedConv ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Select a conversation to start chatting.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b p-3.5">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelected(null)} aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Avatar className="h-9 w-9">
                  {selectedConv.partner.image ? <AvatarImage src={selectedConv.partner.image} alt={selectedConv.partner.name} /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary">{initials(selectedConv.partner.name)}</AvatarFallback>
                </Avatar>
                {partnerOnline && <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" aria-label="online" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{selectedConv.partner.name}</p>
                <p className="text-xs text-muted-foreground">
                  {typing ? "typing…" : partnerOnline ? "online" : "offline"}
                </p>
              </div>
              {selectedConv.bookingId && (
                <a
                  href={`/dashboard/bookings/${selectedConv.bookingId}`}
                  className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/70"
                >
                  View booking
                </a>
              )}
            </div>

            <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div key={m._id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                        m.type === "system"
                          ? "mx-auto bg-muted text-center text-xs text-muted-foreground"
                          : mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-muted",
                      )}
                    >
                      {m.attachment && (
                        <div className="relative mb-1.5 h-40 w-56 overflow-hidden rounded-lg">
                          <Image src={m.attachment.url} alt="attachment" fill className="object-cover" />
                        </div>
                      )}
                      {m.type !== "system" && m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      {m.type !== "system" && <p className="mt-1 text-right text-[10px] opacity-70">{timeAgo(m.createdAt)}</p>}
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-muted-foreground">typing…</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {attachment.length > 0 && (
              <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                Image attached — send to deliver.{" "}
                <button className="underline" onClick={() => setAttachment([])}>remove</button>
              </div>
            )}

            <div className="flex items-center gap-2 border-t p-3">
              <ImageUploader
                kind="chat"
                images={attachment}
                onChange={(imgs) => setAttachment(imgs.slice(-1))}
                max={1}
                label="Attach"
                aspect="square"
                mode="button"
                className="shrink-0"
              />
              <Input
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Type a message…"
                aria-label="Message"
              />
              <Button size="icon" onClick={() => void send()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
