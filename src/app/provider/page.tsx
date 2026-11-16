import Link from "next/link";
import { CalendarCheck, CheckCircle2, Wallet, Star, Eye, Plus, ArrowRight } from "lucide-react";
import { StatCard, PageHeader, EmptyState } from "@/components/shared/misc";
import { StatusBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/guards";
import { providerStats, recentBookingsFor } from "@/server/services/dashboard-service";
import { ProviderProfile } from "@/models";
import { timeAgo, formatMoney } from "@/lib/format";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProviderOverviewPage() {
  const session = await requireRole("provider");
  await connectDB();
  const [stats, recent, profile] = await Promise.all([
    providerStats(session.user.id),
    recentBookingsFor(session.user.id, "provider", 6),
    ProviderProfile.findOne({ userId: session.user.id }).select("slug professionalTitle verification isAvailable").lean(),
  ]);

  const needsSetup = !profile?.professionalTitle;

  return (
    <div className="space-y-6">
      <PageHeader title="Studio overview" description="Your business at a glance.">
        <Button asChild size="sm">
          <Link href="/provider/services/new"><Plus className="mr-1 h-4 w-4" /> New service</Link>
        </Button>
      </PageHeader>

      {needsSetup && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">Complete your public profile</p>
              <p className="text-sm text-muted-foreground">Add your title, bio, service areas and portfolio to start appearing in search.</p>
            </div>
            <Button asChild><Link href="/provider/profile">Complete profile</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total requests" value={stats.totalBookings} sub={`${stats.pending} pending right now`} icon={CalendarCheck} />
        <StatCard label="Completed jobs" value={stats.completed} icon={CheckCircle2} />
        <StatCard label="Earnings (completed)" value={formatMoney(stats.earnings)} sub="cash on completion" icon={Wallet} />
        <StatCard label="Average rating" value={stats.rating > 0 ? stats.rating.toFixed(1) : "New"} sub={`${stats.reviewCount} reviews`} icon={Star} />
        <StatCard label="Profile views" value={stats.views} icon={Eye} />
        <StatCard label="Active services" value={stats.activeServices} icon={ArrowRight} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Latest requests</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/provider/bookings">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No requests yet"
                description="Publish services and share your profile to receive booking requests."
                action={{ href: "/provider/services/new", label: "Create a service" }}
              />
            ) : (
              <ul className="divide-y">
                {recent.map((b) => (
                  <li key={String(b._id)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/provider/bookings/${String(b._id)}`} className="block truncate text-sm font-medium hover:text-primary">
                        {(b.serviceId as { title?: string } | null)?.title ?? "Request"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{b.bookingNumber} · {timeAgo(b.createdAt as Date)}</p>
                    </div>
                    <StatusBadge status={b.status as string} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Your public page</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {profile?.slug ? (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/professionals/${profile.slug}`} target="_blank">View public profile</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/provider/availability">Set availability</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/provider/verification">
                {profile?.verification?.status === "verified" ? "Verified badge active" : "Get verified"}
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              {profile?.verification?.status === "verified"
                ? "Your verified badge builds trust and improves ranking."
                : "Verified providers rank higher and convert better."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
