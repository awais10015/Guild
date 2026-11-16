import { Inbox } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ReportActions } from "@/components/admin/actions";
import { requireRole } from "@/lib/guards";
import { listReports } from "@/server/services/admin-service";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive",
  investigating: "default",
  resolved: "secondary",
  dismissed: "outline",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin");
  const { status = "open" } = await searchParams;
  const reports = await listReports(status);

  return (
    <div className="space-y-5">
      <PageHeader title="Reports & complaints" description="Investigate and resolve user-submitted reports." />

      <Tabs value={status}>
        <TabsList className="h-auto flex-wrap gap-1">
          {["open", "investigating", "resolved", "dismissed", "all"].map((s) => (
            <TabsTrigger key={s} value={s} asChild>
              <Link href={`/admin/reports?status=${s}`} className="capitalize">{s}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {reports.length === 0 ? (
        <EmptyState icon={Inbox} title={`No ${status} reports`} description="The queue is clear." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[r.status as string] ?? "secondary"} className="capitalize">{r.status}</Badge>
                      <span className="text-sm font-medium capitalize">{String(r.reason).replace("_", " ")}</span>
                      <span className="text-xs text-muted-foreground">on {String(r.targetType)} · {formatDateTime(r.createdAt as Date)}</span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{r.description}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Reported by {r.reporter} ({r.reporterEmail}) — target id: <span className="font-mono">{String(r.targetId).slice(0, 12)}…</span>
                      {r.handledBy ? ` — handled ${formatDateTime(r.handledAt as Date)}` : ""}
                    </p>
                  </div>
                  {["open", "investigating"].includes(r.status as string) && <ReportActions reportId={r._id} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
