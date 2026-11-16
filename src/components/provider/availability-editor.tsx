"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DAY_KEYS, DAY_LABELS, type DayKey } from "@/lib/constants";
import { toast } from "sonner";

type Hours = Partial<Record<DayKey, { start: string; end: string }[] | null>>;

export function AvailabilityEditor({
  initialHours,
  initialAvailable,
}: {
  initialHours: Hours;
  initialAvailable: boolean;
}) {
  const router = useRouter();
  const [hours, setHours] = useState<Hours>(initialHours);
  const [available, setAvailable] = useState(initialAvailable);
  const [busy, setBusy] = useState(false);

  async function save(nextAvailable: boolean, nextHours: Hours) {
    setBusy(true);
    try {
      const res = await fetch("/api/providers/me/availability", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isAvailable: nextAvailable, workingHours: nextHours }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success("Availability saved.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly schedule</CardTitle>
        <CardDescription>
          These hours appear on your public profile. You can also update them from the full profile editor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3.5">
          <div>
            <p className="text-sm font-medium">Accepting new work</p>
            <p className="text-xs text-muted-foreground">Shown as a green &quot;Accepting work&quot; badge on your profile.</p>
          </div>
          <Switch
            checked={available}
            onCheckedChange={(v) => {
              setAvailable(v);
              void save(v, hours);
            }}
          />
        </div>

        <div className="space-y-2">
          {DAY_KEYS.map((day) => {
            const slots = hours[day];
            const enabled = !!slots;
            return (
              <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5">
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => {
                    const next = { ...hours, [day]: v ? [{ start: "09:00", end: "18:00" }] : null };
                    setHours(next);
                    void save(available, next);
                  }}
                  aria-label={`${DAY_LABELS[day]} working`}
                />
                <span className="w-24 text-sm">{DAY_LABELS[day]}</span>
                {enabled && slots && slots.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {slots.map((slot, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => {
                            const next = { ...hours, [day]: slots.map((s, idx) => (idx === i ? { ...s, start: e.target.value } : s)) };
                            setHours(next);
                          }}
                          className="w-28 text-xs"
                        />
                        —
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => {
                            const next = { ...hours, [day]: slots.map((s, idx) => (idx === i ? { ...s, end: e.target.value } : s)) };
                            setHours(next);
                          }}
                          className="w-28 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove slot"
                          onClick={() => setHours({ ...hours, [day]: [...slots.filter((_, idx) => idx !== i)] })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setHours({ ...hours, [day]: [...slots, { start: "18:00", end: "21:00" }] })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Split shift
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void save(available, hours)}>
                      Save day
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={() => void save(available, hours)} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save schedule
        </Button>
      </CardContent>
    </Card>
  );
}
