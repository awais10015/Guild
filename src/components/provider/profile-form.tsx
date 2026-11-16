"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader, type UploadedImage } from "@/components/shared/image-uploader";
import { MapView } from "@/components/shared/map-view";
import { GLOBAL_CITIES, DAY_KEYS, DAY_LABELS, LANGUAGES, type DayKey } from "@/lib/constants";
import { cityCenter } from "@/lib/geo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface TaxonomyCategory {
  id: string;
  name: string;
  professions: { id: string; name: string }[];
}

export interface ProfileFormValue {
  professionalTitle: string;
  bio: string;
  professions: string[];
  skills: string;
  experienceYears: number;
  experienceSummary: string;
  languages: string[];
  phone: string;
  whatsapp: string;
  country: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
  serviceAreas: { name: string; city: string; lat: number; lng: number; radiusKm: number }[];
  workingHours: Partial<Record<DayKey, { start: string; end: string }[] | null>>;
  isAvailable: boolean;
}

export interface PortfolioItem {
  url: string;
  publicId?: string | null;
  caption?: string;
}
export interface CertificationItem {
  title: string;
  issuer?: string;
  year?: number | null;
  documentUrl?: string | null;
}

export function ProviderProfileForm({
  taxonomy,
  initial,
  portfolio,
  certifications,
}: {
  taxonomy: TaxonomyCategory[];
  initial: ProfileFormValue;
  portfolio: PortfolioItem[];
  certifications: CertificationItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState<ProfileFormValue>(initial);
  const [portfolioImages, setPortfolioImages] = useState<UploadedImage[]>(
    portfolio.map((p) => ({ url: p.url, publicId: p.publicId ?? null })),
  );
  const [certs, setCerts] = useState<CertificationItem[]>(
    certifications.length ? certifications : [],
  );

  const set = <K extends keyof ProfileFormValue>(key: K, v: ProfileFormValue[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  function onCityChange(city: string) {
    const c = cityCenter(city);
    setValue((prev) => ({
      ...prev,
      city,
      country: GLOBAL_CITIES.find((x) => x.name === city)?.country ?? prev.country,
      lat: c?.lat ?? prev.lat,
      lng: c?.lng ?? prev.lng,
    }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/providers/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            professionalTitle: value.professionalTitle,
            bio: value.bio,
            professions: value.professions,
            skills: value.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
            experienceYears: Number(value.experienceYears) || 0,
            experienceSummary: value.experienceSummary,
            languages: value.languages,
            phone: value.phone,
            whatsapp: value.whatsapp || undefined,
            location: { country: value.country, city: value.city, area: value.area, lat: value.lat, lng: value.lng },
            serviceAreas: value.serviceAreas,
            workingHours: value.workingHours,
            isAvailable: value.isAvailable,
          },
          portfolio: portfolioImages.map((p, i) => ({ ...p, caption: portfolio[i]?.caption ?? "" })),
          certifications: certs.filter((c) => c.title.trim()),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Profile saved. Your public page is up to date.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  const workingHoursValid = (() => {
    for (const day of DAY_KEYS) {
      const slots = value.workingHours[day];
      if (slots && slots.length > 0) {
        for (const s of slots) {
          if (!s.start || !s.end || s.start >= s.end) return false;
        }
      }
    }
    return true;
  })();

  const canSave =
    value.professionalTitle.trim().length >= 4 &&
    value.bio.trim().length >= 20 &&
    value.professions.length > 0 &&
    value.city &&
    /^\+[1-9]\d{6,14}$/.test(value.phone) &&
    value.serviceAreas.length > 0 &&
    workingHoursValid;

  return (
    <div className="space-y-6">
      {/* basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic information</CardTitle>
          <CardDescription>This is the first thing customers see.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Professional title *</Label>
            <Input value={value.professionalTitle} onChange={(e) => set("professionalTitle", e.target.value)} className="mt-1.5" placeholder='e.g. "Licensed Electrician · 10 years experience"' />
          </div>
          <div>
            <Label>About you * <span className="text-xs font-normal text-muted-foreground">(min 20 chars)</span></Label>
            <Textarea value={value.bio} onChange={(e) => set("bio", e.target.value)} rows={5} className="mt-1.5" placeholder="Describe your expertise, guarantees, and how you work…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Years of experience</Label>
              <Input type="number" min={0} max={60} value={value.experienceYears} onChange={(e) => set("experienceYears", Number(e.target.value))} className="mt-1.5" />
            </div>
            <div>
              <Label>Public phone *</Label>
              <Input value={value.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03001234567" className="mt-1.5" />
            </div>
            <div>
              <Label>WhatsApp (optional)</Label>
              <Input value={value.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="03001234567" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Experience highlights</Label>
            <Textarea value={value.experienceSummary} onChange={(e) => set("experienceSummary", e.target.value)} rows={2} className="mt-1.5" placeholder="Notable projects, certifications, employers…" />
          </div>
          <div>
            <Label>Skills <span className="text-xs font-normal text-muted-foreground">(comma separated)</span></Label>
            <Input value={value.skills} onChange={(e) => set("skills", e.target.value)} className="mt-1.5" placeholder="House wiring, Breaker boards, UPS installation" />
          </div>
          <div>
            <Label>Languages</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LANGUAGES.map((lang) => {
                const active = value.languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => set("languages", active ? value.languages.filter((l) => l !== lang) : [...value.languages, lang])}
                    className={cn("rounded-full border px-3 py-1 text-xs transition", active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50")}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* professions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professions *</CardTitle>
          <CardDescription>Pick up to 5 — these determine your search visibility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taxonomy.map((cat) => (
            <div key={cat.id}>
              <p className="text-xs font-semibold text-muted-foreground">{cat.name}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cat.professions.map((p) => {
                  const active = value.professions.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        set("professions", active ? value.professions.filter((x) => x !== p.id) : value.professions.length >= 5 ? value.professions : [...value.professions, p.id])
                      }
                      className={cn("rounded-full border px-3 py-1 text-xs transition", active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50")}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* location + service areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location & coverage *</CardTitle>
          <CardDescription>
            Your registered location is public but approximate (city/area level). Customers never see your street address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>City *</Label>
              <Select value={value.city} onValueChange={onCityChange}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GLOBAL_CITIES.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Area / locality</Label>
              <Input value={value.area} onChange={(e) => set("area", e.target.value)} className="mt-1.5" placeholder="e.g. Gulberg III" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Service areas * <span className="text-xs font-normal text-muted-foreground">(where you actually work)</span></Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  set("serviceAreas", [...value.serviceAreas, { name: "", city: value.city, lat: value.lat, lng: value.lng, radiusKm: 10 }])
                }
              >
                <Plus className="h-4 w-4" /> Add area
              </Button>
            </div>
            <div className="mt-2 space-y-2.5">
              {value.serviceAreas.map((area, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_110px_40px]">
                  <Input
                    placeholder="Area name e.g. DHA Phase 1-5"
                    value={area.name}
                    onChange={(e) => set("serviceAreas", value.serviceAreas.map((a, idx) => (idx === i ? { ...a, name: e.target.value } : a)))}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={area.radiusKm}
                    onChange={(e) => set("serviceAreas", value.serviceAreas.map((a, idx) => (idx === i ? { ...a, radiusKm: Number(e.target.value) } : a)))}
                    aria-label="Radius km"
                  />
                  <span className="self-center text-xs text-muted-foreground">
                    {area.lat.toFixed(3)}, {area.lng.toFixed(3)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove area"
                    onClick={() => set("serviceAreas", value.serviceAreas.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> Click on the map to set the pin of the selected area&apos;s center, then adjust the radius.
            </p>
            <MapView
              markers={value.serviceAreas.map((a) => ({ lat: a.lat, lng: a.lng, label: a.name || "Area", radiusKm: a.radiusKm }))}
              center={{ lat: value.lat, lng: value.lng }}
              zoom={10}
              className="mt-3 h-72 w-full rounded-lg border"
            />
          </div>
        </CardContent>
      </Card>

      {/* availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working hours & availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3.5">
            <div>
              <p className="text-sm font-medium">Accepting new work</p>
              <p className="text-xs text-muted-foreground">Turn off when you&apos;re fully booked — shown on your profile.</p>
            </div>
            <Switch checked={value.isAvailable} onCheckedChange={(v) => set("isAvailable", v)} />
          </div>
          <div className="space-y-2">
            {DAY_KEYS.map((day) => {
              const slots = value.workingHours[day];
              const enabled = !!slots;
              return (
                <div key={day} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) =>
                      set("workingHours", { ...value.workingHours, [day]: v ? [{ start: "09:00", end: "18:00" }] : null })
                    }
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
                            onChange={(e) =>
                              set(
                                "workingHours",
                                { ...value.workingHours, [day]: slots.map((s, idx) => (idx === i ? { ...s, start: e.target.value } : s)) } as ProfileFormValue["workingHours"],
                              )
                            }
                            className="w-28 text-xs"
                          />
                          —
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              set(
                                "workingHours",
                                { ...value.workingHours, [day]: slots.map((s, idx) => (idx === i ? { ...s, end: e.target.value } : s)) } as ProfileFormValue["workingHours"],
                              )
                            }
                            className="w-28 text-xs"
                          />
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* portfolio + certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio</CardTitle>
          <CardDescription>Show examples of your past work (max 20 images).</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploader kind="portfolio" images={portfolioImages} onChange={setPortfolioImages} max={20} label="Add work photo" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certifications</CardTitle>
          <CardDescription>Degrees, trade licenses and course certificates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {certs.map((cert, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_90px_40px]">
              <Input placeholder="Title e.g. Electrician Grade-A license" value={cert.title} onChange={(e) => setCerts(certs.map((c, idx) => (idx === i ? { ...c, title: e.target.value } : c)))} />
              <Input placeholder="Issuer" value={cert.issuer ?? ""} onChange={(e) => setCerts(certs.map((c, idx) => (idx === i ? { ...c, issuer: e.target.value } : c)))} />
              <Input placeholder="Year" type="number" min={1970} max={2035} value={cert.year ?? ""} onChange={(e) => setCerts(certs.map((c, idx) => (idx === i ? { ...c, year: Number(e.target.value) || null } : c)))} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove certification" onClick={() => setCerts(certs.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setCerts([...certs, { title: "", issuer: "", year: null }])}>
            <Plus className="h-4 w-4" /> Add certification
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={save} disabled={busy || !canSave} className="shadow-lg">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}
