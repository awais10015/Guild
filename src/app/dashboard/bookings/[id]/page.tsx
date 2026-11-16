import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, PriceTag } from "@/components/shared/badges";
import { BookingTimeline, BookingActions, QuotationSection } from "@/components/booking/booking-ui";
import { ReviewDialog } from "@/components/shared/review-dialog";
import { requireRole } from "@/lib/guards";
import { getBooking } from "@/server/services/booking-service";
import { connectDB } from "@/lib/db";
import { Review, User, Booking } from "@/models";
import { formatDate, formatMoney } from "@/lib/format";
import type { BookingStatus } from "@/lib/constants";
import type { QuotationWithId } from "@/components/booking/booking-ui";

export const dynamic = "force-dynamic";

export default async function CustomerBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("customer");
  const { id } = await params;
  await connectDB();

  let booking;
  let quotations: QuotationWithId[] = [];
  let conversationId: string | null = null;
  try {
    booking = await getBooking({ id: session.user.id, role: session.user.role }, id);
    const full = await Booking.findById(id).select("conversationId").lean();
    conversationId = (full?.conversationId as string | null) ?? null;
    const { listQuotationsForBooking } = await import("@/server/services/quotation-service");
    quotations = (await listQuotationsForBooking({ id: session.user.id, role: session.user.role }, id)) as unknown as QuotationWithId[];
  } catch {
    notFound();
  }

  const service = booking.serviceId as { title?: string; images?: { url: string }[] } | null;
  const provider = await User.findById(booking.providerId).select("name image").lean();
  const review = await Review.findOne({ bookingId: id }).select("_id").lean();
  const status = booking.status as BookingStatus;
  const isParticipantCustomer = booking.customerId === session.user.id;

  return (
    <div className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
          <Link href="/dashboard/bookings"><ArrowLeft className="h-4 w-4" /> My bookings</Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{service?.title ?? "Booking"}</h1>
            <p className="text-sm text-muted-foreground">{booking.bookingNumber} · created {formatDate(booking.createdAt as Date)}</p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Job details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">{booking.description}</p>
              {booking.attachments && (booking.attachments as { url: string }[]).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(booking.attachments as { url: string }[]).map((img, i) => (
                     
                    <img key={i} src={img.url} alt={`attachment ${i + 1}`} className="h-20 w-20 rounded-lg border object-cover" />
                  ))}
                </div>
              )}
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scheduled</p>
                  <p className="mt-1 font-medium">{formatDate(booking.scheduledDate as Date)} · {String(booking.scheduledTime)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agreed price</p>
                  <p className="mt-1 font-medium">
                    {(booking.pricing as { amount?: number | null }).amount != null
                      ? formatMoney((booking.pricing as { amount: number }).amount)
                      : <PriceTag model={(booking.pricing as { model: string }).model} price={null} />}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service address</p>
                  <p className="mt-1">
                    {booking.address?.streetAddress}, {booking.address?.area ? `${booking.address.area}, ` : ""}{booking.address?.city}
                    <br />
                    <span className="text-muted-foreground">Contact: {booking.address?.contactName} · {booking.address?.contactPhone}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <QuotationSection bookingId={id} quotations={quotations} role="customer" bookingStatus={status} />

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Status history</CardTitle></CardHeader>
            <CardContent>
              <BookingTimeline history={(booking.statusHistory ?? []) as never} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-medium">Provider</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {(provider?.name ?? "?").slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{provider?.name ?? "Professional"}</p>
                  <p className="text-xs text-muted-foreground">on Guild</p>
                </div>
              </div>
              {conversationId && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/messages?c=${conversationId}`}><MessageSquare className="mr-2 h-4 w-4" /> Open chat</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {isParticipantCustomer && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <p className="text-sm font-medium">Actions</p>
                <BookingActions
                  bookingId={id}
                  status={status}
                  role="customer"
                  isCustomer
                  isProvider={false}
                />
                {status === "completed" && !review && (
                  <ReviewDialog bookingId={id} providerName={provider?.name ?? "the provider"} trigger={<Button className="w-full">Leave a review</Button>} />
                )}
                {status === "completed" && review && (
                  <p className="text-xs text-muted-foreground">You reviewed this booking. Thank you!</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
