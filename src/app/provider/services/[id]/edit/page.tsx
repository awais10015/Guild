import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/misc";
import { ServiceForm } from "@/components/provider/service-form";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Service, Category, Profession } from "@/models";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("provider");
  const { id } = await params;
  await connectDB();

  if (!/^[0-9a-fA-F]{24}$/.test(id)) notFound();
  const service = await Service.findById(id).lean();
  if (!service) notFound();
  if (service.providerId !== session.user.id) redirect("/provider/services");

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
      <PageHeader title="Edit service" description={service.title} />
      <ServiceForm
        taxonomy={taxonomy}
        serviceId={String(service._id)}
        initial={{
          title: service.title,
          description: service.description,
          professionId: String(service.professionId),
          pricingModel: service.pricingModel as never,
          price: service.price != null ? String(service.price) : "",
          durationHours: service.durationHours != null ? String(service.durationHours) : "",
          isActive: !!service.isActive,
        }}
      />
    </div>
  );
}
