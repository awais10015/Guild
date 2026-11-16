import { PageHeader } from "@/components/shared/misc";
import { ServiceForm } from "@/components/provider/service-form";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Category, Profession } from "@/models";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  await requireRole("provider");
  await connectDB();
  const [categories, professions] = await Promise.all([
    Category.find({ isActive: true }).sort({ order: 1 }).lean(),
    Profession.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);
  const taxonomy = categories.map((c) => ({
    id: String(c._id),
    name: c.name,
    professions: professions
      .filter((p) => String(p.categoryId) === String(c._id))
      .map((p) => ({ id: String(p._id), name: p.name })),
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="New service" description="Describe the service exactly as you deliver it." />
      <ServiceForm
        taxonomy={taxonomy}
        initial={{ title: "", description: "", professionId: "", pricingModel: "fixed", price: "", durationHours: "", isActive: true }}
      />
    </div>
  );
}
