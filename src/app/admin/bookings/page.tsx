import Link from "next/link";
import { PageHeader } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/badges";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Booking, User } from "@/models";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requireRole("admin");
  await connectDB();
  const bookings = await Booking.find({}).sort({ createdAt: -1 }).limit(60).populate("serviceId", "title").lean();
  const userIds = [...new Set(bookings.flatMap((b) => [String(b.customerId), String(b.providerId)]))];
  const users = await User.find({ _id: { $in: userIds } }).select("name").lean();
  const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

  return (
    <div className="space-y-5">
      <PageHeader title="All bookings" description="Latest 60 bookings. Open one to resolve disputes." />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3.5">Booking</th>
                  <th className="p-3.5">Service</th>
                  <th className="p-3.5">Customer → Provider</th>
                  <th className="p-3.5">Scheduled</th>
                  <th className="p-3.5">Value</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={String(b._id)} className="border-b last:border-0">
                    <td className="p-3.5">
                      <Link href={`/admin/bookings/${String(b._id)}`} className="font-medium hover:text-primary">
                        {b.bookingNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(b.createdAt as Date)}</p>
                    </td>
                    <td className="max-w-48 truncate p-3.5">{(b.serviceId as { title?: string } | null)?.title ?? "—"}</td>
                    <td className="p-3.5 text-xs">
                      {nameMap.get(String(b.customerId)) ?? "?"} → {nameMap.get(String(b.providerId)) ?? "?"}
                    </td>
                    <td className="p-3.5 text-muted-foreground">{formatDate(b.scheduledDate as Date)}</td>
                    <td className="p-3.5">{(b.pricing as { amount?: number | null }).amount != null ? formatMoney((b.pricing as { amount: number }).amount) : "—"}</td>
                    <td className="p-3.5"><StatusBadge status={b.status as string} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
