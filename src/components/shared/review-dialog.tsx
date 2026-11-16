"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUploader, type UploadedImage } from "@/components/shared/image-uploader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function StarPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${label}: ${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange(i)}
            className="rounded p-0.5 transition hover:scale-110"
          >
            <Star className={cn("h-5 w-5", i <= value ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600")} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewDialog({
  bookingId,
  providerName,
  trigger,
}: {
  bookingId: string;
  providerName: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overall, setOverall] = useState(5);
  const [quality, setQuality] = useState(5);
  const [professionalism, setProfessionalism] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  async function submit() {
    if (comment.trim().length < 10) {
      toast.warning("Please write at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingId,
          overall,
          quality,
          professionalism,
          communication,
          comment: comment.trim(),
          images,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success("Review published. Thank you!");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Write a review</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {providerName}</DialogTitle>
          <DialogDescription>Your feedback helps other customers hire with confidence.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StarPicker value={overall} onChange={setOverall} label="Overall rating" />
          <StarPicker value={quality} onChange={setQuality} label="Service quality" />
          <StarPicker value={professionalism} onChange={setProfessionalism} label="Professionalism" />
          <StarPicker value={communication} onChange={setCommunication} label="Communication" />
          <div>
            <Label htmlFor="rv-comment">Your review *</Label>
            <Textarea
              id="rv-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What went well? What could be better?"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Photos (optional)</Label>
            <ImageUploader kind="booking" images={images} onChange={setImages} max={4} label="Add photo" className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Publishing…" : "Publish review"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
