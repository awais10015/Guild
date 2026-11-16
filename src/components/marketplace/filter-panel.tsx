"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PRICING_MODELS, PRICING_MODEL_LABELS } from "@/lib/constants";

export interface TaxonomyData {
  id: string;
  name: string;
  slug: string;
  professions: { id: string; name: string; slug: string }[];
}

const SORTS = [
  { value: "rating", label: "Highest rating" },
  { value: "nearest", label: "Nearest to me" },
  { value: "relevance", label: "Most relevant" },
  { value: "price_low", label: "Lowest price" },
  { value: "experience", label: "Most experienced" },
  { value: "reviews", label: "Most reviewed" },
];

export function FilterPanel({ taxonomy, cities }: { taxonomy: TaxonomyData[]; cities: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function setParam(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "any") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/professionals?${params.toString()}`);
  }

  const current = (key: string) => searchParams.get(key) ?? "";
  const activeCount = ["profession", "category", "minRating", "verified", "available", "pricingModel", "maxPrice", "minExperience"].filter((k) => searchParams.get(k)).length;

  const body = (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Profession</Label>
        <Select value={current("profession") || "any"} onValueChange={(v) => setParam("profession", v)}>
          <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">All professions</SelectItem>
            {taxonomy.map((cat) => (
              <SelectGroup key={cat.id}>
                <SelectLabel>{cat.name}</SelectLabel>
                {cat.professions.map((p) => (
                  <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">City</Label>
        <Select value={current("city") || "any"} onValueChange={(v) => setParam("city", v)}>
          <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Minimum rating</Label>
        <Select value={current("minRating") || "any"} onValueChange={(v) => setParam("minRating", v)}>
          <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="4.5">4.5+ stars</SelectItem>
            <SelectItem value="4">4+ stars</SelectItem>
            <SelectItem value="3">3+ stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Pricing model</Label>
        <Select value={current("pricingModel") || "any"} onValueChange={(v) => setParam("pricingModel", v)}>
          <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {PRICING_MODELS.map((m) => (
              <SelectItem key={m} value={m}>{PRICING_MODEL_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Max price (USD)</Label>
        <Input
          type="number"
          min={1}
          placeholder="e.g. 10000"
          className="mt-1.5"
          defaultValue={current("maxPrice")}
          onBlur={(e) => setParam("maxPrice", e.target.value || undefined)}
        />
      </div>

      <div>
        <Label className="text-xs">Min. experience (years)</Label>
        <Input
          type="number"
          min={0}
          max={60}
          placeholder="e.g. 5"
          className="mt-1.5"
          defaultValue={current("minExperience")}
          onBlur={(e) => setParam("minExperience", e.target.value || undefined)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="f-verified" className="text-xs">Verified only</Label>
        <Switch
          id="f-verified"
          checked={current("verified") === "true"}
          onCheckedChange={(v) => setParam("verified", v ? "true" : undefined)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="f-available" className="text-xs">Available now</Label>
        <Switch
          id="f-available"
          checked={current("available") === "true"}
          onCheckedChange={(v) => setParam("available", v ? "true" : undefined)}
        />
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push("/professionals")}>
          <X className="h-4 w-4" /> Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* desktop */}
      <aside className="sticky top-20 hidden h-fit w-64 shrink-0 rounded-xl border bg-card p-4 lg:block">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" /> Filters
          <span className="ml-auto text-xs font-normal text-muted-foreground">Sort</span>
        </div>
        <Select value={current("sort") || "rating"} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="mb-4 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {body}
      </aside>

      {/* mobile trigger */}
      <div className="mb-3 flex items-center gap-2 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && `(${activeCount})`}
        </Button>
        <Select value={current("sort") || "rating"} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            {body}
            <Button className="mt-5 w-full" onClick={() => setOpen(false)}>Show results</Button>
          </div>
        </div>
      )}
    </>
  );
}
