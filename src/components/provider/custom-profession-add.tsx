"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface TaxonomyProfessionRow {
  id: string;
  name: string;
}

export interface TaxonomyCategoryRow {
  id: string;
  name: string;
  professions: TaxonomyProfessionRow[];
}

type SuggestResponse = {
  ok: boolean;
  error?: string;
  data: { id: string; name: string; categoryId: string; created: boolean };
};

const OTHER_CATEGORY_NAME = "Other";

export function sortCategoriesForSelect(categories: { id: string; name: string }[]) {
  const other = categories.filter((c) => c.name === OTHER_CATEGORY_NAME);
  const rest = categories.filter((c) => c.name !== OTHER_CATEGORY_NAME);
  return [...rest, ...other];
}

export function defaultCustomProfessionCategoryId(categories: { id: string; name: string }[]) {
  return categories.find((c) => c.name === OTHER_CATEGORY_NAME)?.id ?? categories[0]?.id ?? "";
}

export function mergeProfessionIntoTaxonomy(
  taxonomy: TaxonomyCategoryRow[],
  profession: { id: string; name: string; categoryId: string },
): TaxonomyCategoryRow[] {
  return taxonomy.map((cat) => {
    if (cat.id !== profession.categoryId) return cat;
    if (cat.professions.some((p) => p.id === profession.id)) return cat;
    return {
      ...cat,
      professions: [...cat.professions, { id: profession.id, name: profession.name }].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    };
  });
}

interface Props {
  categories: { id: string; name: string }[];
  selectedIds: string[];
  max?: number;
  onAdd: (professionId: string) => void;
  onTaxonomyUpdated?: (next: TaxonomyCategoryRow[]) => void;
  taxonomy?: TaxonomyCategoryRow[];
  className?: string;
}

export function CustomProfessionAdd({
  categories,
  selectedIds,
  max = 5,
  onAdd,
  onTaxonomyUpdated,
  taxonomy,
  className,
}: Props) {
  const [name, setName] = useState("");
  const sortedCategories = useMemo(() => sortCategoriesForSelect(categories), [categories]);
  const [categoryId, setCategoryId] = useState(() => defaultCustomProfessionCategoryId(sortedCategories));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCategoryId((prev) => (sortedCategories.some((c) => c.id === prev) ? prev : defaultCustomProfessionCategoryId(sortedCategories)));
  }, [sortedCategories]);

  async function addCustom() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Enter a profession name (at least 2 characters).");
      return;
    }
    if (!categoryId) {
      toast.error("Pick a category for your profession.");
      return;
    }
    if (selectedIds.length >= max) {
      toast.warning(`You can select up to ${max} professions.`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/professions/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, categoryId }),
      });
      const json = (await res.json()) as SuggestResponse;
      if (!json.ok) throw new Error(json.error ?? "Could not add profession.");

      const { id, name: profName, categoryId: catId, created } = json.data;
      if (selectedIds.includes(id)) {
        toast.info(`"${profName}" is already in your list.`);
      } else {
        onAdd(id);
        toast.success(created ? `Added "${profName}" to the catalog and your profile.` : `Added existing profession "${profName}".`);
      }

      if (taxonomy && onTaxonomyUpdated) {
        onTaxonomyUpdated(mergeProfessionIntoTaxonomy(taxonomy, { id, name: profName, categoryId: catId }));
      }
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add profession.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <p className="text-sm font-medium">Don&apos;t see your profession?</p>
      <p className="text-xs text-muted-foreground">
        Defaults to <span className="font-medium text-foreground/80">Other</span> or pick the closest category — new
        titles become searchable for everyone.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Label htmlFor="custom-profession-name" className="text-xs">
            Profession name
          </Label>
          <Input
            id="custom-profession-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Solar panel installer"'
            className="mt-1"
            maxLength={60}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addCustom();
              }
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Label className="text-xs">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={busy}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {sortedCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" onClick={() => void addCustom()} disabled={busy || selectedIds.length >= max}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </div>
    </div>
  );
}