import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/marketplace/search-bar";
import { FilterPanel } from "@/components/marketplace/filter-panel";
import { ProviderCard } from "@/components/marketplace/cards";
import { Pagination, EmptyState } from "@/components/shared/misc";
import { MapView, type MapMarker } from "@/components/shared/map-view";
import { searchProviders, citiesWithProviders } from "@/server/services/search-service";
import { searchQuerySchema } from "@/lib/validations";
import { connectDB } from "@/lib/db";
import { Category, Profession, User } from "@/models";
import { GLOBAL_CITIES } from "@/lib/constants";
import { getSession } from "@/lib/guards";
import { fromGeoJSONPoint } from "@/lib/geo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find professionals",
  description: "Search verified local professionals by profession, city, area, rating and distance.",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfessionalsPage({ searchParams }: Props) {
  await connectDB();
  const sp = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }
  const parsed = searchQuerySchema.safeParse(flat);
  const params = parsed.success ? parsed.data : searchQuerySchema.parse({});

  /* user location: ?lat/lng params (from browser) else default to city center */
  const center =
    params.lat != null && params.lng != null
      ? { lat: params.lat, lng: params.lng }
      : null;

  const [result, cities, categories, session] = await Promise.all([
    searchProviders({ ...params, lat: center?.lat, lng: center?.lng }),
    citiesWithProviders(),
    Category.find({ isActive: true }).sort({ order: 1 }).lean(),
    getSession(),
  ]);

  const professions = await Profession.find({ isActive: true }).sort({ name: 1 }).lean();
  const taxonomy = categories.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    professions: professions
      .filter((p) => String(p.categoryId) === String(c._id))
      .map((p) => ({ id: String(p._id), name: p.name, slug: p.slug })),
  }));
  const cityOptions = [...new Set([...cities, ...GLOBAL_CITIES.map((c) => c.name)])];

  const markers = result.items
    .map((item) => {
      /* re-fetch pin coords: distance exists only in geo mode; otherwise use city center */
      if (item.distanceKm != null && center) {
        return { lat: center.lat, lng: center.lng, label: item.name };
      }
      return null;
    })
    .filter(Boolean);

  /* pins need real coordinates — fetch profiles for the page */
  const { ProviderProfile } = await import("@/models");
  const profilePins: (MapMarker | null)[] =
    result.items.length > 0
      ? (
          await ProviderProfile.find({ userId: { $in: result.items.map((i) => i.userId) } })
            .select("userId location serviceAreas")
            .lean()
        ).map((p) => {
          const loc = fromGeoJSONPoint(p.location);
          const area = p.serviceAreas?.[0] ? fromGeoJSONPoint(p.serviceAreas[0].coordinates) : null;
          const point = area ?? loc;
          return point ? { lat: point.lat, lng: point.lng, label: result.items.find((i) => i.userId === p.userId)?.name } : null;
        })
      : [];

  const makeHref = (page: number) => {
    const qs = new URLSearchParams(flat);
    qs.set("page", String(page));
    return `/professionals?${qs.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Suspense>
          <SearchBar cities={cityOptions} initialQuery={params.q ?? ""} initialCity={params.city ?? ""} />
        </Suspense>
      </div>

      <div className="flex gap-8">
        <Suspense>
          <FilterPanel taxonomy={taxonomy} cities={cityOptions} />
        </Suspense>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{result.total}</span> professional
              {result.total === 1 ? "" : "s"} found
              {params.city ? ` in ${params.city}` : ""}
              {params.q ? ` for “${params.q}”` : ""}
            </p>
            {session?.user?.role === "customer" && (
              <Button asChild size="sm" variant="outline">
                <a
                  href={`https://www.openstreetmap.org/geocoder/search?query=${encodeURIComponent(params.city || "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Locate me
                </a>
              </Button>
            )}
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No professionals match your filters"
              description="Try removing some filters, widening the area, or searching a different profession."
              action={{ href: "/professionals", label: "Reset search" }}
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {result.items.map((p) => (
                  <ProviderCard key={p.userId} provider={p} />
                ))}
              </div>

              {profilePins.filter(Boolean).length > 1 && (
                <div className="mt-8">
                  <h2 className="mb-3 text-sm font-semibold">Locations on the map</h2>
                  <MapView
                    markers={profilePins.filter((p): p is MapMarker => !!p)}
                    center={center ?? undefined}
                    zoom={center ? 11 : 6}
                    className="h-[360px] w-full rounded-xl border"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pins show public service locations only — street addresses are never displayed.
                  </p>
                </div>
              )}

              <div className="mt-8">
                <Pagination page={result.page} pages={result.pages} makeHref={makeHref} />
              </div>

              <div className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                Want distance-based results?{" "}
                <Link href="/how-it-works" className="font-medium text-primary hover:underline">
                  Learn how nearby search works
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
