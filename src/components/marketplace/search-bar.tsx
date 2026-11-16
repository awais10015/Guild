"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function SearchBar({
  cities,
  className,
  initialQuery = "",
  initialCity = "",
}: {
  cities: string[];
  className?: string;
  initialQuery?: string;
  initialCity?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [city, setCity] = useState(initialCity || searchParams.get("city") || "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    router.push(`/professionals?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className={
        className ??
        "flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm sm:flex-row sm:items-center"
      }
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What do you need? e.g. AC service, leak repair, wedding photographer…"
          className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
          aria-label="Search services"
        />
      </div>
      <div className="relative sm:w-48">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-full border-0 bg-transparent pl-9 shadow-none focus:ring-0">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="sm:px-8">
        Search
      </Button>
    </form>
  );
}
