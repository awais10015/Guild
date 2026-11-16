import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryIcon } from "@/components/marketplace/category-icon";
import { connectDB } from "@/lib/db";
import { Category, Profession } from "@/models";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service categories",
  description: "Browse all service categories on Guild — from electrical and plumbing to beauty, tutoring and events.",
};

export default async function CategoriesPage() {
  await connectDB();
  const [categories, professions] = await Promise.all([
    Category.find({ isActive: true }).sort({ order: 1 }).lean(),
    Profession.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">All categories</h1>
      <p className="mt-2 text-muted-foreground">
        {professions.length} professions across {categories.length} categories — every profession is managed
        from the admin panel, no code changes needed.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const profs = professions.filter((p) => String(p.categoryId) === String(cat._id));
          return (
            <Card key={String(cat._id)} className="transition hover:border-primary/40 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <CategoryIcon name={cat.icon} className="h-7 w-7 text-primary" />
                  </div>
                  <Link href={`/categories/${cat.slug}`} aria-label={`Open ${cat.name}`} className="text-primary">
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                <h2 className="mt-4 font-semibold">
                  <Link href={`/categories/${cat.slug}`} className="hover:text-primary">{cat.name}</Link>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profs.slice(0, 4).map((p) => (
                    <Link
                      key={String(p._id)}
                      href={`/professionals?profession=${p.slug}`}
                      className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                    >
                      {p.name}
                    </Link>
                  ))}
                  {profs.length > 4 && <span className="text-xs text-muted-foreground">+{profs.length - 4} more</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
