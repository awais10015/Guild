"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader, type UploadedImage } from "@/components/shared/image-uploader";
import { PRICING_MODELS, PRICING_MODEL_LABELS, type PricingModel } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ServiceFormValue {
  title: string;
  description: string;
  professionId: string;
  pricingModel: PricingModel;
  price: string;
  durationHours: string;
  isActive: boolean;
}

function validateServiceForm(value: ServiceFormValue, needsPrice: boolean): string[] {
  const errors: string[] = [];
  const titleLen = value.title.trim().length;
  if (titleLen < 5) errors.push(`Title: at least 5 characters (${titleLen}/5).`);
  const descLen = value.description.trim().length;
  if (descLen < 30) errors.push(`Description: at least 30 characters (${descLen}/30).`);
  if (!value.professionId) errors.push("Select a profession.");
  if (needsPrice && (Number.isNaN(Number(value.price)) || Number(value.price) < 1)) {
    errors.push("Enter a price of at least $1.");
  }
  if (value.durationHours.trim() !== "") {
    const d = Number(value.durationHours);
    if (Number.isNaN(d) || d < 0.5 || d > 24) {
      errors.push("Duration must be between 0.5 and 24 hours, or leave it blank.");
    }
  }
  return errors;
}

export function ServiceForm({
  taxonomy,
  initial,
  serviceId,
}: {
  taxonomy: { id: string; name: string; professions: { id: string; name: string }[] }[];
  initial: ServiceFormValue;
  serviceId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState<ServiceFormValue>(initial);
  const [images, setImages] = useState<UploadedImage[]>([]);

  const set = <K extends keyof ServiceFormValue>(key: K, v: ServiceFormValue[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  const needsPrice = value.pricingModel !== "custom";
  const validationErrors = validateServiceForm(value, needsPrice);
  const canSave = validationErrors.length === 0;
  const titleLen = value.title.trim().length;
  const descLen = value.description.trim().length;

  async function save() {
    const errors = validateServiceForm(value, needsPrice);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: value.title.trim(),
        description: value.description.trim(),
        professionId: value.professionId,
        pricingModel: value.pricingModel,
        price: needsPrice ? Math.round(Number(value.price)) : null,
        durationHours: value.durationHours.trim() ? Number(value.durationHours) : null,
        images,
        isActive: value.isActive,
      };
      const res = await fetch(serviceId ? `/api/services/${serviceId}` : "/api/services", {
        method: serviceId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success(serviceId ? "Service updated." : "Service published!");
      router.push("/provider/services");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!serviceId) return;
    if (!window.confirm("Delete this service? Bookings with history will keep it but hide it from the marketplace.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success(json.data.deleted ? "Service deleted." : "Service deactivated (has bookings).");
      router.push("/provider/services");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={value.title} onChange={(e) => set("title", e.target.value)} className="mt-1.5" placeholder="e.g. Split AC installation with gas charging" />
            <p className={cn("mt-1 text-xs", titleLen >= 5 ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400")}>
              {titleLen}/5 characters minimum
            </p>
          </div>
          <div>
            <Label>Description * <span className="text-xs font-normal text-muted-foreground">(what&apos;s included, what&apos;s extra)</span></Label>
            <Textarea value={value.description} onChange={(e) => set("description", e.target.value)} rows={6} className="mt-1.5" />
            <p className={cn("mt-1 text-xs", descLen >= 30 ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400")}>
              {descLen}/30 characters minimum
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Profession *</Label>
              <Select value={value.professionId} onValueChange={(v) => set("professionId", v)}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Select profession" /></SelectTrigger>
                <SelectContent>
                  {taxonomy.map((cat) => (
                    <SelectGroup key={cat.id}>
                      <SelectLabel>{cat.name}</SelectLabel>
                      {cat.professions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pricing model *</Label>
              <Select value={value.pricingModel} onValueChange={(v) => set("pricingModel", v as PricingModel)}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>{PRICING_MODEL_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {needsPrice && (
              <div>
                <Label>Price (USD) *</Label>
                <Input type="number" min={1} value={value.price} onChange={(e) => set("price", e.target.value)} className="mt-1.5" placeholder="e.g. 120" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {value.pricingModel === "hourly" ? "Charged per hour." : value.pricingModel === "starting" ? "Customers see \"from $X\"." : "Fixed total price."}
                </p>
              </div>
            )}
            <div>
              <Label>Estimated duration (hours)</Label>
              <Input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={value.durationHours}
                onChange={(e) => set("durationHours", e.target.value)}
                className="mt-1.5"
                placeholder="e.g. 3"
              />
              <p className="mt-1 text-xs text-muted-foreground">Optional. Between 0.5 and 24 hours per visit.</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive services are hidden from search.</p>
            </div>
            <Switch checked={value.isActive} onCheckedChange={(v) => set("isActive", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
          <CardDescription>First image is the cover. Max 8.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploader kind="service" images={images} onChange={setImages} max={8} label="Add image" />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {serviceId ? (
          <Button variant="outline" onClick={remove} disabled={busy}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col items-end gap-2">
          {!canSave && validationErrors.length > 0 && (
            <ul className="max-w-md text-right text-xs text-muted-foreground">
              {validationErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
          <Button size="lg" onClick={() => void save()} disabled={busy} variant={canSave ? "default" : "secondary"}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {serviceId ? "Save changes" : "Publish service"}
          </Button>
        </div>
      </div>
    </div>
  );
}
