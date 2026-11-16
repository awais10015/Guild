import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, CalendarCheck, MessageSquareHeart, Search, ShieldCheck, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/marketplace/search-bar";
import { ProviderCard } from "@/components/marketplace/cards";
import { CategoryIcon } from "@/components/marketplace/category-icon";
import { featuredProviders, citiesWithProviders } from "@/server/services/search-service";
import { connectDB } from "@/lib/db";
import { Category, Profession, User } from "@/models";
import { GLOBAL_CITIES } from "@/lib/constants";
import { getSession } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connectDB();
  const [categories, professions, featured, cities, session] = await Promise.all([
    Category.find({ isActive: true }).sort({ order: 1 }).lean(),
    Profession.find({ isActive: true }).sort({ name: 1 }).lean(),
    featuredProviders(6),
    citiesWithProviders(),
    getSession(),
  ]);

  const profCountByCategory = new Map<string, number>();
  for (const p of professions) {
    const key = String(p.categoryId);
    profCountByCategory.set(key, (profCountByCategory.get(key) ?? 0) + 1);
  }
  const cityOptions = [...new Set([...cities, ...GLOBAL_CITIES.map((c) => c.name)])];

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified professionals worldwide
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              The world&apos;s skilled professionals,{" "}
              <span className="text-primary">on demand</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Electricians, plumbers, AC technicians, cleaners, photographers and more —
              compare profiles, request quotations and book with confidence.
            </p>
            <div className="mx-auto mt-8 max-w-2xl">
              <SearchBar cities={cityOptions} />
            </div>
            {!session?.user && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/register">Join as a professional</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/how-it-works">How it works</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Browse by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">{professions.length} professions across {categories.length} categories</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/categories">All categories <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={String(cat._id)}
              href={`/categories/${cat.slug}`}
              className="group rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="rounded-lg bg-primary/10 p-2.5 w-fit transition group-hover:bg-primary group-hover:[&>svg]:text-white">
                <CategoryIcon name={cat.icon} className="h-6 w-6 text-primary transition" />
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-tight">{cat.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{profCountByCategory.get(String(cat._id)) ?? 0} professions</p>
            </Link>
          ))}
        </div>
      </section>

      {/* featured providers */}
      <section className="border-t bg-muted/30 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Top-rated professionals</h2>
              <p className="mt-1 text-sm text-muted-foreground">Verified providers with outstanding reviews</p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/professionals">See all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          {featured.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((p) => (
                <ProviderCard key={p.userId} provider={p} />
              ))}
            </div>
          ) : (
            <Card className="mt-6">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No professionals yet — be the first to join!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight">How Guild works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Search, title: "1 · Search & compare", text: "Find professionals by profession, city, area and distance. Compare ratings, portfolios and pricing." },
            { icon: MessageSquareHeart, title: "2 · Book or request a quote", text: "Send a booking request with photos of the job, or ask for a custom quotation — chat built in." },
            { icon: Star, title: "3 · Pay on completion & review", text: "Settle in cash when the job is done, then leave a review that helps the whole community." },
          ].map((s) => (
            <Card key={s.title} className="border-dashed">
              <CardContent className="p-6 text-center">
                <div className="mx-auto rounded-xl bg-primary/10 p-3 w-fit">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* provider CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6">
          <BadgeCheck className="h-10 w-10" />
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            Are you a skilled professional? Grow your business with Guild.
          </h2>
          <p className="max-w-xl text-primary-foreground/85">
            Free registration. Publish your services, build a portfolio, receive booking requests
            and get discovered by customers in your service areas.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                <CalendarCheck className="mr-2 h-4 w-4" /> Create your free profile
              </Link>
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-6 text-sm text-primary-foreground/80">
            <span className="flex items-center gap-1.5"><Image width={0} height={0} src="/logo.svg" alt="" className="hidden" />Free to join</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Get verified</span>
            <span className="flex items-center gap-1.5"><Star className="h-4 w-4" /> Build your reputation</span>
          </div>
        </div>
      </section>
    </>
  );
}
