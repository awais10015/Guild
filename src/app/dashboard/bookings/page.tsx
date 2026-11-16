import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { StatusBadge, PriceTag } from "@/components/shared/badges";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole } from "@/lib/guards";
import { listBookings } from "@/server/services/booking-service";
import { BOOKING_STATUSES, STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole("customer");
  const { status } = await searchParams;
  const filter = BOOKING_STATUSES.includes(status as BookingStatus) ? (status as BookingStatus) : undefined;
  const bookings = await listBookings({ id: session.user.id, role: "customer" }, filter);

  return (
    <div className="space-y-5">
      <PageHeader title="My bookings" description="Track requests, quotations and completed jobs." />

      <Tabs value={filter ?? "all"}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/bookings">All</Link>
          </TabsTrigger>
          {BOOKING_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} asChild>
              <Link href={`/dashboard/bookings?status=${s}`}>{STATUS_LABELS[s]}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings here"
          description={filter ? `No ${STATUS_LABELS[filter].toLowerCase()} bookings right now.` : "Book your first service to see it here."}
          action={{ href: "/professionals", label: "Find professionals" }}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={String(b._id)} className="transition hover:border-primary/40">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/bookings/${String(b._id)}`} className="font-medium hover:text-primary">
                    {(b.serviceId as { title?: string } | null)?.title ?? "Service"}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.bookingNumber} · scheduled {formatDate(b.scheduledDate as Date)} · {String(b.scheduledTime)}
                  </p>
                </div>
                {(b.pricing as { amount?: number | null }).amount != null && (
                  <span className="text-sm font-semibold">{formatMoney((b.pricing as { amount: number }).amount)}</span>
                )}
                <StatusBadge status={b.status as string} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
