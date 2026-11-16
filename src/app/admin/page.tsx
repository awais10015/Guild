import { Users, ShieldCheck, CalendarCheck, Store, Flag, Star } from "lucide-react";
import { StatCard, PageHeader } from "@/components/shared/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingsPerDayChart, StatusPieChart, CategoryBarChart } from "@/components/dashboard/charts";
import { requireRole } from "@/lib/guards";
import { adminStats } from "@/server/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireRole("admin");
  const stats = await adminStats();

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Key metrics across the marketplace." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.users} sub={`${stats.customers} customers · ${stats.providers} providers`} icon={Users} />
        <StatCard label="Verified providers" value={stats.verified} sub={`${stats.pendingVerification} pending verification`} icon={ShieldCheck} />
        <StatCard label="Total bookings" value={stats.bookings} sub={`${stats.services} active services`} icon={CalendarCheck} />
        <StatCard label="Open reports" value={stats.openReports} sub={`${stats.reports} reports all-time`} icon={Flag} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Bookings — last 14 days</CardTitle></CardHeader>
          <CardContent>
            <BookingsPerDayChart data={stats.bookingsPerDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Bookings by status</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={stats.bookingsByStatus} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Service listings by category</CardTitle></CardHeader>
        <CardContent>
          <CategoryBarChart data={stats.topCategories} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Providers" value={stats.providers} icon={Store} />
        <StatCard label="Customers" value={stats.customers} icon={Users} />
        <StatCard label="Reviews awaiting action" value={stats.openReports} icon={Star} />
      </div>
    </div>
  );
}
