import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/badges";
import { BookingTimeline, BookingActions } from "@/components/booking/booking-ui";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Booking, User } from "@/models";
import { formatDate, formatMoney } from "@/lib/format";
import type { BookingStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await connectDB();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) notFound();

  const booking = await Booking.findById(id).populate("serviceId", "title").lean();
  if (!booking) notFound();

  const [customer, provider] = await Promise.all([
    User.findById(booking.customerId).select("name email").lean(),
    User.findById(booking.providerId).select("name email").lean(),
  ]);
  const status = booking.status as BookingStatus;

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
          <Link href="/admin/bookings"><ArrowLeft className="h-4 w-4" /> All bookings</Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {(booking.serviceId as { title?: string } | null)?.title ?? "Booking"} <span className="text-muted-foreground">({booking.bookingNumber})</span>
            </h1>
            <p className="text-sm text-muted-foreground">Created {formatDate(booking.createdAt as Date)}</p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">{booking.description}</p>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="mt-1">{customer?.name} — {customer?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Provider</p>
                  <p className="mt-1">{provider?.name} — {provider?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scheduled</p>
                  <p className="mt-1">{formatDate(booking.scheduledDate as Date)} · {String(booking.scheduledTime)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Value</p>
                  <p className="mt-1">{(booking.pricing as { amount?: number | null }).amount != null ? formatMoney((booking.pricing as { amount: number }).amount) : "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service address</p>
                  <p className="mt-1">{booking.address?.streetAddress}, {booking.address?.city} — {booking.address?.contactPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Status history</CardTitle></CardHeader>
            <CardContent><BookingTimeline history={(booking.statusHistory ?? []) as never} /></CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-medium">Admin actions</p>
            {status === "disputed" && (
              <p className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 text-xs">
                This booking is disputed. Review the history and both parties&apos; messages, then resolve it as completed or cancelled.
              </p>
            )}
            <BookingActions bookingId={id} status={status} role="admin" isCustomer={false} isProvider={false} />
            {booking.conversationId && (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/messages?c=${String(booking.conversationId)}`}><MessageSquare className="mr-2 h-4 w-4" /> Inspect chat</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
