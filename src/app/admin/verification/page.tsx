import { ShieldCheck, Inbox } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerificationDecision } from "@/components/admin/actions";
import { requireRole } from "@/lib/guards";
import { listVerificationQueue } from "@/server/services/admin-service";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin");
  const { status = "pending" } = await searchParams;
  const queue = await listVerificationQueue(status);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Verification queue"
        description="Review submitted documents and grant the verified badge."
      />

      {queue.length === 0 ? (
        <EmptyState icon={Inbox} title={`No ${status} requests`} description="New verification submissions will appear here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {queue.map((r) => (
            <Card key={String(r._id ?? "")}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.userId?.name ?? "Provider"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.userId?.email} · submitted {formatDate(r.submittedAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    <ShieldCheck className="mr-1 h-3 w-3" /> {r.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(r.documents ?? []).map((doc, i) => (
                    <a
                      key={i}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-lg border"
                      title={`${doc.type}: ${doc.label}`}
                    >
                      { }
                      <img src={doc.url} alt={doc.label} className="h-24 w-full object-cover transition group-hover:scale-105" />
                      <p className="truncate border-t bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">{doc.type}</p>
                    </a>
                  ))}
                </div>

                {r.status === "pending" && <VerificationDecision requestId={String(r._id)} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
