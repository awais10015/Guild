"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useUserChannel } from "@/lib/realtime";
import { toast } from "sonner";

/**
 * Global realtime listener mounted in the site header.
 * Shows a toast when a notification arrives and refreshes server-rendered
 * unread badges; the messages page does its own finer-grained subscription.
 */
export function RealtimeBridge() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  useUserChannel(userId, {
    onNotification: (n) => {
      const title = typeof n.title === "string" && n.title ? n.title : "New notification";
      const body = typeof n.body === "string" ? n.body : "";
      toast.message(title, { description: body || undefined });
      router.refresh();
    },
    onConversationUpdate: () => router.refresh(),
  });

  return null;
}
