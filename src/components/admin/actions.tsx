"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw, Check, X, EyeOff, Eye, Flag, Loader2, Plus, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

async function patch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Action failed");
  return json;
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run(url: string, body: unknown, successMsg: string) {
    setBusy(true);
    try {
      await patch(url, body);
      toast.success(successMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

/* ---------------- users ---------------- */

export function AdminUserActions({
  userId,
  banned,
  isProvider,
  providerSuspended,
}: {
  userId: string;
  banned: boolean;
  isProvider: boolean;
  providerSuspended: boolean;
}) {
  const { busy, run } = useAction();
  return (
    <div className="flex flex-wrap gap-1.5">
      {banned ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(`/api/admin/users/${userId}`, { action: "unban" }, "Account reinstated.")}>
          <RotateCcw className="h-3.5 w-3.5" /> Reinstate
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const reason = window.prompt("Reason for suspending this account (shown to the user):") ?? "";
            if (!reason.trim()) return;
            void run(`/api/admin/users/${userId}`, { action: "ban", reason }, "Account suspended.");
          }}
        >
          <Ban className="h-3.5 w-3.5" /> Suspend
        </Button>
      )}
      {isProvider && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            run(
              `/api/admin/users/${userId}`,
              { action: providerSuspended ? "unsuspend-provider" : "suspend-provider" },
              providerSuspended ? "Provider reinstated on marketplace." : "Provider hidden from marketplace.",
            )
          }
        >
          <ShieldAlert className="h-3.5 w-3.5" /> {providerSuspended ? "Unhide listings" : "Hide listings"}
        </Button>
      )}
    </div>
  );
}

/* ---------------- verification ---------------- */

export function VerificationDecision({ requestId }: { requestId: string }) {
  const { busy, run } = useAction();
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        placeholder="Review notes (required when rejecting)…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/verification/${requestId}`, { action: "approve" }, "Provider approved — badge granted.")}>
          <Check className="h-4 w-4" /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !notes.trim()}
          onClick={() => run(`/api/admin/verification/${requestId}`, { action: "reject", notes }, "Request rejected.")}
        >
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
    </div>
  );
}

/* ---------------- reports ---------------- */

export function ReportActions({ reportId }: { reportId: string }) {
  const { busy, run } = useAction();
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(`/api/admin/reports/${reportId}`, { action: "investigating" }, "Marked investigating.")}>
        <Flag className="h-3.5 w-3.5" /> Investigate
      </Button>
      <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/reports/${reportId}`, { action: "resolved", note: "Resolved by admin." }, "Report resolved.")}>
        <Check className="h-3.5 w-3.5" /> Resolve
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(`/api/admin/reports/${reportId}`, { action: "dismissed" }, "Report dismissed.")}>
        <X className="h-3.5 w-3.5" /> Dismiss
      </Button>
    </div>
  );
}

/* ---------------- review moderation ---------------- */

export function ReviewModerationActions({ reviewId, status }: { reviewId: string; status: string }) {
  const { busy, run } = useAction();
  return (
    <div className="flex gap-1.5">
      {status !== "hidden" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(`/api/admin/reviews/${reviewId}`, { action: "hide" }, "Review hidden.")}>
          <EyeOff className="h-3.5 w-3.5" /> Hide
        </Button>
      )}
      {status !== "visible" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(`/api/admin/reviews/${reviewId}`, { action: "unhide" }, "Review restored.")}>
          <Eye className="h-3.5 w-3.5" /> Restore
        </Button>
      )}
    </div>
  );
}

/* ---------------- taxonomy manager ---------------- */

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  description: string;
  order: number;
  professions: { id: string; name: string; keywords: string[] }[];
}

export function TaxonomyManager({ initial }: { initial: CategoryRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", icon: "wrench", description: "" });
  const [newProf, setNewProf] = useState<Record<string, { name: string; keywords: string }>>({});

  async function call(method: string, url: string, body?: unknown, msg = "Saved.") {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success(msg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {initial.map((cat) => (
        <div key={cat.id} className="rounded-xl border">
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{cat.name}</p>
              <p className="text-xs text-muted-foreground">icon: {cat.icon} · order {cat.order}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                const name = window.prompt("Rename category:", cat.name);
                if (!name) return;
                void call("PATCH", `/api/categories/${cat.id}`, { name }, "Category renamed.");
              }}
            >
              Rename
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void call("DELETE", `/api/categories/${cat.id}`, undefined, "Category deleted.")}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-1.5">
              {cat.professions.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                  {p.name}
                  <button
                    aria-label={`Delete profession ${p.name}`}
                    className="text-muted-foreground hover:text-red-500"
                    onClick={() => void call("DELETE", `/api/professions/${p.id}`, undefined, "Profession removed.")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {cat.professions.length === 0 && <span className="text-xs text-muted-foreground">No professions yet.</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs">New profession</Label>
                <Input
                  className="mt-1 w-52"
                  placeholder="e.g. Solar Technician"
                  value={newProf[cat.id]?.name ?? ""}
                  onChange={(e) => setNewProf({ ...newProf, [cat.id]: { name: e.target.value, keywords: newProf[cat.id]?.keywords ?? "" } })}
                />
              </div>
              <div>
                <Label className="text-xs">Keywords (comma sep)</Label>
                <Input
                  className="mt-1 w-56"
                  placeholder="solar, panel, inverter"
                  value={newProf[cat.id]?.keywords ?? ""}
                  onChange={(e) => setNewProf({ ...newProf, [cat.id]: { name: newProf[cat.id]?.name ?? "", keywords: e.target.value } })}
                />
              </div>
              <Button
                size="sm"
                disabled={busy || !newProf[cat.id]?.name}
                onClick={() => {
                  const p = newProf[cat.id];
                  void call(
                    "POST",
                    "/api/professions",
                    { categoryId: cat.id, name: p.name, keywords: p.keywords.split(",").map((k) => k.trim()).filter(Boolean) },
                    "Profession added.",
                  );
                  setNewProf({ ...newProf, [cat.id]: { name: "", keywords: "" } });
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-dashed p-4">
        <Label className="text-sm font-medium">New category</Label>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Input className="w-48" placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <Input className="w-36" placeholder="Icon (lucide name)" value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })} />
          <Input className="w-64" placeholder="Short description" value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} />
          <Button
            disabled={busy || !newCat.name.trim()}
            onClick={() => {
              void call("POST", "/api/categories", newCat, "Category created.");
              setNewCat({ name: "", icon: "wrench", description: "" });
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Icons: wrench, zap, droplets, hammer, paintbrush, building-2, sparkles, ruler, car, camera, graduation-cap, scissors, air-vent
        </p>
      </div>
    </div>
  );
}
