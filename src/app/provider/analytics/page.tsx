import { PageHeader, StatCard } from "@/components/shared/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Star, Eye, Wallet } from "lucide-react";
import { requireRole } from "@/lib/guards";
import { providerStats } from "@/server/services/dashboard-service";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProviderAnalyticsPage() {
  const session = await requireRole("provider");
  const stats = await providerStats(session.user.id);

  const conversion = stats.totalBookings > 0 ? Math.round((stats.completed / stats.totalBookings) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="How your studio is performing." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" value={stats.totalBookings} icon={BarChart3} />
        <StatCard label="Completion rate" value={`${conversion}%`} sub={`${stats.completed} of ${stats.totalBookings} jobs`} icon={Star} />
        <StatCard label="Earnings" value={formatMoney(stats.earnings)} sub="from completed jobs" icon={Wallet} />
        <StatCard label="Profile views" value={stats.views} icon={Eye} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Pending requests", value: stats.pending, hint: "waiting for your response" },
              { label: "Quotation stage", value: stats.accepted, hint: "accepted / quotation sent" },
              { label: "Confirmed & in progress", value: stats.confirmed, hint: "scheduled work" },
              { label: "Completed", value: stats.completed, hint: "paid & reviewed" },
              { label: "Cancelled / disputed", value: stats.cancelled, hint: "lost work" },
            ].map((row) => {
              const pct = stats.totalBookings > 0 ? Math.round((row.value / stats.totalBookings) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.label} <span className="font-normal text-muted-foreground">({row.hint})</span></span>
                    <span className="text-muted-foreground">{row.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reputation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{stats.rating > 0 ? stats.rating.toFixed(1) : "—"}</p>
            <p className="text-xs text-muted-foreground">average rating</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{stats.reviewCount}</p>
            <p className="text-xs text-muted-foreground">total reviews</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{stats.pendingReplies}</p>
            <p className="text-xs text-muted-foreground">reviews awaiting your reply</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
