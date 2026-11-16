import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/badges";
import { requireRole } from "@/lib/guards";
import { listBookings } from "@/server/services/booking-service";
import { BOOKING_STATUSES, STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProviderBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole("provider");
  const { status } = await searchParams;
  const filter = BOOKING_STATUSES.includes(status as BookingStatus) ? (status as BookingStatus) : undefined;
  const bookings = await listBookings({ id: session.user.id, role: "provider" }, filter);

  return (
    <div className="space-y-5">
      <PageHeader title="Requests & jobs" description="Accept, quote, schedule and complete work." />

      <Tabs value={filter ?? "all"}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="all" asChild><Link href="/provider/bookings">All</Link></TabsTrigger>
          {BOOKING_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} asChild>
              <Link href={`/provider/bookings?status=${s}`}>{STATUS_LABELS[s]}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nothing here"
          description={filter ? `No ${STATUS_LABELS[filter].toLowerCase()} jobs right now.` : "New requests will appear here."}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={String(b._id)} className="transition hover:border-primary/40">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/provider/bookings/${String(b._id)}`} className="font-medium hover:text-primary">
                    {(b.serviceId as { title?: string } | null)?.title ?? "Request"}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.bookingNumber} · {formatDate(b.scheduledDate as Date)} · {String(b.scheduledTime)}
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
