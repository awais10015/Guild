import { PageHeader } from "@/components/shared/misc";
import { TaxonomyManager } from "@/components/admin/actions";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Category, Profession } from "@/models";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole("admin");
  await connectDB();
  const [categories, professions] = await Promise.all([
    Category.find({}).sort({ order: 1, name: 1 }).lean(),
    Profession.find({}).sort({ name: 1 }).lean(),
  ]);

  const initial = categories.map((c) => ({
    id: String(c._id),
    name: c.name,
    icon: c.icon,
    description: c.description ?? "",
    order: c.order ?? 0,
    professions: professions
      .filter((p) => String(p.categoryId) === String(c._id))
      .map((p) => ({ id: String(p._id), name: p.name, keywords: (p.keywords ?? []) as string[] })),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories & professions"
        description="The taxonomy drives the whole marketplace — add a profession and it instantly appears in search, onboarding and filters. No code changes needed."
      />
      <TaxonomyManager initial={initial} />
    </div>
  );
}
