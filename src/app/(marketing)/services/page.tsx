import { Suspense } from "react";
import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { SearchBar } from "@/components/marketplace/search-bar";
import { FilterPanel } from "@/components/marketplace/filter-panel";
import { ServiceCard } from "@/components/marketplace/cards";
import { Pagination, EmptyState } from "@/components/shared/misc";
import { searchServices } from "@/server/services/search-service";
import { searchQuerySchema } from "@/lib/validations";
import { connectDB } from "@/lib/db";
import { Category, Profession } from "@/models";
import { GLOBAL_CITIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse services",
  description: "Explore fixed-price, hourly and custom-quoted services offered by local professionals across the globe.",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ServicesPage({ searchParams }: Props) {
  await connectDB();
  const sp = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }
  const parsed = searchQuerySchema.safeParse(flat);
  const params = parsed.success ? parsed.data : searchQuerySchema.parse({});

  const [result, categories, professions] = await Promise.all([
    searchServices(params),
    Category.find({ isActive: true }).sort({ order: 1 }).lean(),
    Profession.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  const taxonomy = categories.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    professions: professions
      .filter((p) => String(p.categoryId) === String(c._id))
      .map((p) => ({ id: String(p._id), name: p.name, slug: p.slug })),
  }));
  const cityOptions = GLOBAL_CITIES.map((c) => c.name);

  const makeHref = (page: number) => {
    const qs = new URLSearchParams(flat);
    qs.set("page", String(page));
    return `/services?${qs.toString()}`;
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
          <div className="mb-4">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Wrench className="size-5 text-primary" /> Services
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{result.total}</span> service
              {result.total === 1 ? "" : "s"} found
              {params.city ? ` in ${params.city}` : ""}
              {params.q ? ` for “${params.q}”` : ""} — transparent pricing, no hidden fees.
            </p>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No services match your filters"
              description="Try removing some filters or searching for a different profession — providers also accept custom quotes."
              action={{ href: "/services", label: "Reset search" }}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((s) => (
                  <ServiceCard key={s.id} service={s} href={`/services/${s.id}`} />
                ))}
              </div>

              {result.pages > 1 && (
                <div className="mt-8">
                  <Pagination page={result.page} pages={result.pages} makeHref={makeHref} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
