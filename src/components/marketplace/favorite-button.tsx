"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function FavoriteButton({
  providerId,
  initial,
  variant = "icon",
}: {
  providerId: string;
  initial: boolean;
  variant?: "icon" | "full";
}) {
  const [favorited, setFavorited] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      if (res.status === 401) {
        toast.warning("Sign in to save favorites.");
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setFavorited(json.data.favorited);
        toast.success(json.data.favorited ? "Saved to favorites" : "Removed from favorites");
      } else {
        toast.error(json.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (variant === "full") {
    return (
      <Button variant="outline" onClick={toggle} disabled={busy} className="w-full">
        <Heart className={cn("h-4 w-4", favorited && "fill-red-500 text-red-500")} />
        {favorited ? "Saved" : "Save to favorites"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition hover:scale-105 dark:bg-black/60"
    >
      <Heart className={cn("h-4 w-4", favorited ? "fill-red-500 text-red-500" : "text-zinc-700 dark:text-zinc-200")} />
    </button>
  );
}
