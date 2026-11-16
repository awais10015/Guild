import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/marketplace/category-icon";
import { ProviderCard } from "@/components/marketplace/cards";
import { connectDB } from "@/lib/db";
import { Category, Profession } from "@/models";
import { searchProviders } from "@/server/services/search-service";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const cat = await Category.findOne({ slug }).lean();
  return cat ? { title: cat.name, description: cat.description } : { title: "Category not found" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  await connectDB();
  const category = await Category.findOne({ slug }).lean();
  if (!category) notFound();

  const professions = await Profession.find({ categoryId: category._id, isActive: true }).sort({ name: 1 }).lean();
  const result = await searchProviders({ category: slug, sort: "rating", page: 1 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-primary/10 p-3.5">
          <CategoryIcon name={category.icon} className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
          <p className="mt-1 text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {professions.map((p) => (
          <Link
            key={String(p._id)}
            href={`/professionals?profession=${p.slug}`}
            className="rounded-full border px-4 py-1.5 text-sm transition hover:border-primary/50 hover:bg-muted"
          >
            {p.name}
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold">
          {result.total} professional{result.total === 1 ? "" : "s"} in {category.name}
        </h2>
        {result.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No professionals listed in this category yet.{" "}
            <Link href="/register" className="text-primary hover:underline">Join as a provider</Link>
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((p) => (
              <ProviderCard key={p.userId} provider={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
