"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function StartConversationButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  async function startConversation() {
    setBusy(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (json.ok && json.data?.conversationId) {
        window.location.href = `/messages?c=${json.data.conversationId}`;
        return;
      }
      toast.error(json.error?.message ?? "Could not open conversation.");
    } catch {
      toast.error("Could not open conversation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" className="w-full" disabled={busy} onClick={() => void startConversation()}>
      <MessageSquare className="h-4 w-4" /> Message
    </Button>
  );
}