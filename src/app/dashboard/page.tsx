import Link from "next/link";
import { CalendarCheck, CheckCircle2, Heart, MessageSquare, Star } from "lucide-react";
import { StatCard, PageHeader, EmptyState } from "@/components/shared/misc";
import { StatusBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/guards";
import { customerStats, recentBookingsFor } from "@/server/services/dashboard-service";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const session = await requireRole("customer");
  const [stats, recent] = await Promise.all([
    customerStats(session.user.id),
    recentBookingsFor(session.user.id, "customer", 6),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${session.user.name.split(" ")[0]}`} description="Here's what's happening with your bookings." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active bookings" value={stats.active} icon={CalendarCheck} />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} />
        <StatCard label="Favorites" value={stats.favorites} icon={Heart} />
        <StatCard label="My reviews" value={stats.reviews} icon={Star} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent bookings</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No bookings yet"
                description="Find a professional and request your first booking."
                action={{ href: "/professionals", label: "Browse professionals" }}
              />
            ) : (
              <ul className="divide-y">
                {recent.map((b) => (
                  <li key={String(b._id)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/bookings/${String(b._id)}`} className="block truncate text-sm font-medium hover:text-primary">
                        {(b.serviceId as { title?: string } | null)?.title ?? "Booking"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {b.bookingNumber} · {timeAgo(b.createdAt as Date)}
                      </p>
                    </div>
                    <StatusBadge status={b.status as string} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/professionals"><CalendarCheck className="mr-2 h-4 w-4" /> Book a service</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/favorites"><Heart className="mr-2 h-4 w-4" /> View favorites</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/messages"><MessageSquare className="mr-2 h-4 w-4" /> Messages</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
