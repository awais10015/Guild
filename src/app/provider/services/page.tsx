import Link from "next/link";
import { Plus, Eye, CalendarCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceTag } from "@/components/shared/badges";
import { PauseToggle } from "@/components/provider/pause-toggle";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Service } from "@/models";

export const dynamic = "force-dynamic";

export default async function ProviderServicesPage() {
  const session = await requireRole("provider");
  await connectDB();
  const services = await Service.find({ providerId: session.user.id }).sort({ createdAt: -1 }).lean();

  return (
    <div className="space-y-5">
      <PageHeader title="My services" description="Create, edit, pause or delete your service listings.">
        <Button asChild size="sm">
          <Link href="/provider/services/new"><Plus className="mr-1 h-4 w-4" /> New service</Link>
        </Button>
      </PageHeader>

      {services.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No services yet"
          description="List what you do — pricing can be fixed, hourly, starting-from or custom quotation."
          action={{ href: "/provider/services/new", label: "Create your first service" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <Card key={String(s._id)} className={s.isActive ? "" : "opacity-70"}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/services/${String(s._id)}`} className="font-medium hover:text-primary">
                      {s.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  </div>
                  <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Paused"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <PriceTag model={s.pricingModel as string} price={(s.price as number | null) ?? null} />
                  <span className="flex items-center gap-1 text-muted-foreground"><Eye className="h-3.5 w-3.5" /> {s.stats?.views ?? 0}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><CalendarCheck className="h-3.5 w-3.5" /> {s.stats?.bookings ?? 0}</span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/provider/services/${String(s._id)}/edit`}>Edit</Link>
                  </Button>
                  <PauseToggle serviceId={String(s._id)} isActive={!!s.isActive} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
