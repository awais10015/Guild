"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import { useSession } from "@/lib/auth-client";
import { useUserChannel } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: { entityType?: string; entityId?: string };
  readAt: string | null;
  createdAt: string;
}

function hrefFor(n: NotificationItem): string | null {
  const t = n.data?.entityType;
  const id = n.data?.entityId;
  if (t === "booking" && id) return `/dashboard/bookings/${id}`;
  if (t === "conversation" && id) return "/messages";
  return null;
}

export function NotificationList() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=50");
    const json = await res.json();
    if (json.ok) {
      setItems(json.data.notifications);
      setUnread(json.data.unread);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async loader, state updates land after await
    void load();
  }, [load]);

  useUserChannel(userId, {
    onNotification: () => void load(),
  });

  async function markRead(ids?: string[]) {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    const json = await res.json();
    if (json.ok) {
      setUnread(json.data.unread);
      setItems((prev) =>
        prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    }
  }

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "You're all caught up."}
        </p>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markRead()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const href = hrefFor(n);
            const content = (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3.5 transition",
                  !n.readAt && "border-primary/30 bg-primary/5",
                )}
              >
                <div className={cn("mt-0.5 rounded-full p-2", !n.readAt ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}
                </div>
                {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            );
            return href ? (
              <a
                key={n.id}
                href={href}
                onClick={() => {
                  if (!n.readAt) void markRead([n.id]);
                }}
                className="block"
              >
                {content}
              </a>
            ) : (
              <button
                key={n.id}
                className="block w-full text-left"
                onClick={() => {
                  if (!n.readAt) void markRead([n.id]);
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
      <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.refresh()}>
        Refresh
      </Button>
    </div>
  );
}
