"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/badges";
import { BOOKING_TRANSITIONS, STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { formatMoney, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import type { QuotationDoc } from "@/models/quotation";

/** Quotation documents carry their Mongo id when passed from server components. */
export type QuotationWithId = QuotationDoc & { _id: unknown; createdAt?: Date };

export interface HistoryEntry {
  status: string;
  byUserId: string;
  at: string | Date;
  note?: string;
}

export function BookingTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <ol className="relative ml-3 space-y-5 border-l">
      {history.map((h, i) => (
        <li key={i} className="relative pl-6">
          <span
            className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${
              i === history.length - 1 ? "bg-primary" : "bg-muted-foreground/40"
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={h.status} />
            <span className="text-xs text-muted-foreground">{formatDateTime(h.at)}</span>
          </div>
          {h.note && <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}

const ACTION_LABELS: Partial<Record<BookingStatus, string>> = {
  accepted: "Accept request",
  rejected: "Decline",
  quotation_sent: "Send quotation",
  confirmed: "Confirm booking",
  in_progress: "Start work",
  completed: "Mark completed",
  cancelled: "Cancel booking",
  disputed: "Raise dispute",
};

export function BookingActions({
  bookingId,
  status,
  role,
  isCustomer,
  isProvider,
}: {
  bookingId: string;
  status: BookingStatus;
  role: "customer" | "provider" | "admin";
  isCustomer: boolean;
  isProvider: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const allowed = BOOKING_TRANSITIONS[status] ?? {};
  const actions = Object.entries(allowed)
    .filter(([, roles]) => role === "admin" || (isCustomer && roles.includes("customer")) || (isProvider && roles.includes("provider")))
    .map(([to]) => to as BookingStatus);

  if (actions.length === 0) return null;

  async function transition(to: BookingStatus, note?: string) {
    setBusy(to);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: to, note }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success(`Booking ${STATUS_LABELS[to].toLowerCase()}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((to) => (
        <Button
          key={to}
          size="sm"
          variant={["rejected", "cancelled", "disputed"].includes(to) ? "outline" : "default"}
          disabled={busy !== null}
          onClick={() => {
            if (to === "rejected" || to === "cancelled") {
              const note = window.prompt(`Add a short note (optional) for ${STATUS_LABELS[to].toLowerCase()}:`) ?? "";
              void transition(to, note);
            } else {
              void transition(to);
            }
          }}
        >
          {to === "accepted" && <CheckCircle2 className="h-4 w-4" />}
          {to === "rejected" && <XCircle className="h-4 w-4" />}
          {ACTION_LABELS[to] ?? STATUS_LABELS[to]}
        </Button>
      ))}
    </div>
  );
}

export function QuotationSection({
  bookingId,
  quotations,
  role,
  bookingStatus,
}: {
  bookingId: string;
  quotations: QuotationWithId[];
  role: "customer" | "provider" | "admin";
  bookingStatus: BookingStatus;
}) {
  const router = useRouter();
  const [items, setItems] = useState([{ label: "", amount: "" }]);
  const [note, setNote] = useState("");
  const [validDays, setValidDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const active = quotations.find((q) => q.status === "sent");
  const canSend = role === "provider" && ["accepted", "quotation_sent"].includes(bookingStatus);
  const canRespond = role === "customer" && !!active && bookingStatus === "quotation_sent";

  async function sendQuotation() {
    setBusy(true);
    try {
      const payload = {
        bookingId,
        items: items
          .filter((i) => i.label.trim() && Number(i.amount) > 0)
          .map((i) => ({ label: i.label.trim(), amount: Math.round(Number(i.amount)) })),
        note,
        validDays: Number(validDays) || 7,
      };
      if (payload.items.length === 0) {
        toast.warning("Add at least one line item.");
        return;
      }
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success("Quotation sent to the customer.");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(action: "accepted" | "declined") {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/quotations/${String(active._id)}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success(action === "accepted" ? "Quotation accepted — booking confirmed!" : "Quotation declined.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4.5 w-4.5 text-primary" /> Quotations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {canSend
              ? "Send an itemized quotation for this request."
              : "No quotation has been sent for this booking yet."}
          </p>
        )}

        {quotations.map((q) => (
          <div key={String(q._id)} className="rounded-lg border p-3.5">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={q.status === "sent" ? "quotation_sent" : q.status === "accepted" ? "confirmed" : "cancelled"} />
              <span className="text-xs text-muted-foreground">
                valid until {formatDateTime(q.validUntil as Date)}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {q.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{formatMoney(item.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex justify-between border-t pt-2.5 text-sm font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatMoney(q.totalAmount)}</span>
            </div>
            {q.note && <p className="mt-2 text-xs text-muted-foreground">{q.note}</p>}
            {canRespond && q.status === "sent" && String(q._id) === String(active?._id) && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => respond("accepted")} disabled={busy}>Accept quotation</Button>
                <Button size="sm" variant="outline" onClick={() => respond("declined")} disabled={busy}>Decline</Button>
              </div>
            )}
          </div>
        ))}

        {canSend && (
          <>
            {!showForm ? (
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> New quotation
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3.5">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Item description"
                      value={item.label}
                      onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Rs"
                      value={item.amount}
                      onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, amount: e.target.value } : it)))}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove item"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" onClick={() => setItems([...items, { label: "", amount: "" }])}>
                  <Plus className="h-4 w-4" /> Add line
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Valid for (days)</Label>
                    <Input type="number" min={1} max={30} value={validDays} onChange={(e) => setValidDays(e.target.value)} className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Note</Label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" placeholder="Anything the customer should know…" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={sendQuotation} disabled={busy}>Send quotation</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
