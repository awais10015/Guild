"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader, type UploadedImage } from "@/components/shared/image-uploader";
import { TIME_SLOTS } from "@/lib/constants";
import { toast } from "sonner";

interface Props {
  serviceId: string;
  serviceTitle: string;
  defaults?: { contactName?: string; contactPhone?: string; city?: string; area?: string };
  /** Trigger element: pass as `trigger` or as children — both render inside the dialog trigger. */
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function BookingDialog({ serviceId, serviceTitle, defaults, trigger, children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId,
          description: String(form.get("description") ?? ""),
          attachments: images,
          address: {
            contactName: String(form.get("contactName") ?? ""),
            contactPhone: String(form.get("contactPhone") ?? ""),
            city: String(form.get("city") ?? ""),
            area: String(form.get("area") ?? ""),
            streetAddress: String(form.get("streetAddress") ?? ""),
          },
          scheduledDate: String(form.get("scheduledDate") ?? ""),
          scheduledTime: String(form.get("scheduledTime") ?? ""),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      toast.success("Booking request sent! The provider has been notified.");
      setOpen(false);
      router.push(`/dashboard/bookings/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? children ?? (
          <Button size="lg" className="w-full sm:w-auto">
            <CalendarClock className="h-4 w-4" /> Request booking
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request booking</DialogTitle>
          <DialogDescription>{serviceTitle}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bk-desc">Describe the work needed *</Label>
            <Textarea
              id="bk-desc"
              name="description"
              required
              minLength={20}
              rows={3}
              placeholder="e.g. Two ceiling fans need installation, one room's switch board is tripping…"
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bk-date">Preferred date *</Label>
              <Input id="bk-date" name="scheduledDate" type="date" required min={today} defaultValue={today} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="bk-time">Preferred time *</Label>
              <Select name="scheduledTime" defaultValue={TIME_SLOTS[0]}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bk-name">Contact name *</Label>
              <Input id="bk-name" name="contactName" required defaultValue={defaults?.contactName ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="bk-phone">Contact phone *</Label>
              <Input id="bk-phone" name="contactPhone" required placeholder="03001234567" defaultValue={defaults?.contactPhone ?? ""} className="mt-1.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bk-city">City *</Label>
              <Input id="bk-city" name="city" required defaultValue={defaults?.city ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="bk-area">Area</Label>
              <Input id="bk-area" name="area" defaultValue={defaults?.area ?? ""} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="bk-street">Street address *</Label>
            <Input id="bk-street" name="streetAddress" required placeholder="House/flat, street, landmark…" defaultValue={defaults && `${defaults.area ? defaults.area + ", " : ""}${defaults.city ?? ""}` === "" ? "" : ""} className="mt-1.5" />
          </div>
          <div>
            <Label>Photos (optional)</Label>
            <p className="mb-2 text-xs text-muted-foreground">A picture of the problem helps the provider quote accurately.</p>
            <ImageUploader kind="booking" images={images} onChange={setImages} max={5} label="Add photo" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
