"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronLeft, Loader2, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession, type SessionData } from "@/lib/auth-client";
import { GLOBAL_CITIES } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaxonomyProfession {
  id: string;
  name: string;
  slug: string;
}
interface TaxonomyCategory {
  id: string;
  name: string;
  professions: TaxonomyProfession[];
}

export function OnboardingWizard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [role, setRole] = useState<"customer" | "provider" | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomyCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  /* provider fields */
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [professions, setProfessions] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  /* customer fields */
  const [cCity, setCCity] = useState("");
  const [cArea, setCArea] = useState("");

  useEffect(() => {
    const s = session as unknown as SessionData;
    if (s?.user?.role && s.user.role !== "customer") {
      setRole(s.user.role === "provider" ? "provider" : null);
    }
    if (s?.user?.phone) setPhone(s.user.phone);
  }, [session]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setTaxonomy(json.data);
      });
  }, []);

  const filteredTaxonomy = useMemo(() => {
    if (!search.trim()) return taxonomy;
    const q = search.toLowerCase();
    return taxonomy
      .map((cat) => ({
        ...cat,
        professions: cat.professions.filter(
          (p) => p.name.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.professions.length > 0);
  }, [taxonomy, search]);

  async function submit() {
    setBusy(true);
    try {
      const body =
        role === "customer"
          ? { role: "customer", phone, city: cCity, area: cArea }
          : {
              role: "provider",
              phone,
              professionalTitle: title,
              professions,
              city,
              area,
              bio,
            };
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Setup failed");
      toast.success("You're all set!");
      router.push(json.data.redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  /* ---------- step 1: role ---------- */
  if (!role) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-center text-2xl font-bold">How will you use Guild?</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          You can start offering services later from your dashboard if you begin as a customer.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setRole("customer")}
            className="group rounded-2xl border p-6 text-left transition hover:border-primary/50 hover:shadow-md"
          >
            <div className="rounded-xl bg-primary/10 p-3 w-fit">
              <UserRound className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold">Hire professionals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Find and book electricians, plumbers, cleaners and more near you.
            </p>
          </button>
          <button
            onClick={() => setRole("provider")}
            className="group rounded-2xl border p-6 text-left transition hover:border-primary/50 hover:shadow-md"
          >
            <div className="rounded-xl bg-amber-500/10 p-3 w-fit">
              <Briefcase className="h-7 w-7 text-amber-600" />
            </div>
            <h3 className="mt-4 font-semibold">Offer services</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a professional profile, list services and receive requests.
            </p>
          </button>
        </div>
      </div>
    );
  }

  /* ---------- step 2: role-specific form ---------- */
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setRole(null)}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <CardTitle className="text-xl">
          {role === "customer" ? "Set up your customer profile" : "Set up your professional profile"}
        </CardTitle>
        <CardDescription>
          {role === "customer"
            ? "Tell us where you are so we can show nearby professionals."
            : "This becomes your public profile. You can enrich it later in the studio."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Mobile number *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 415 555 2671"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">Used for booking coordination.</p>
          </div>
          {role === "provider" ? (
            <>
              <div>
                <Label>City *</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {GLOBAL_CITIES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}, {c.country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Professional title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g. "Certified Electrician · 8 years experience"'
                  className="mt-1.5"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>City *</Label>
                <Select value={cCity} onValueChange={setCCity}>
                  <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {GLOBAL_CITIES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}, {c.country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Area / locality</Label>
                <Input value={cArea} onChange={(e) => setCArea(e.target.value)} placeholder="e.g. Brooklyn Heights" className="mt-1.5" />
              </div>
            </>
          )}
        </div>

        {role === "provider" && (
          <div>
            <Label>Your professions * <span className="text-xs font-normal text-muted-foreground">(pick up to 5)</span></Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search professions…" className="pl-9" />
            </div>
            <div className="scrollbar-thin mt-3 max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3">
              {filteredTaxonomy.map((cat) => (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-muted-foreground">{cat.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {cat.professions.map((p) => {
                      const selected = professions.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setProfessions(
                              selected
                                ? professions.filter((id) => id !== p.id)
                                : professions.length >= 5
                                  ? professions
                                  : [...professions, p.id],
                            )
                          }
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:border-primary/50",
                          )}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredTaxonomy.length === 0 && (
                <p className="text-sm text-muted-foreground">No professions match your search.</p>
              )}
            </div>
            <div>
              <Label className="mt-4">Short introduction</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tell customers what you do best… (you can expand this later)"
                className="mt-1.5 w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={submit}
          disabled={
            busy ||
            !phone ||
            (role === "customer" ? !cCity : !city || !title.trim() || professions.length === 0)
          }
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {role === "customer" ? "Start hiring" : "Create my studio"}
        </Button>
      </CardContent>
    </Card>
  );
}
