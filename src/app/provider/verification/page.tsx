import { ShieldCheck, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationForm } from "@/components/provider/verification-form";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { ProviderProfile, VerificationRequest } from "@/models";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_TEXT: Record<string, string> = {
  unverified: "You are not verified yet. Verified profiles earn a badge and rank higher in search.",
  pending: "Your documents are under review. We usually respond within 24-48 hours.",
  verified: "Your identity and credentials are verified. The badge is live on your profile.",
  rejected: "Your last request was not approved. Update your documents and submit again.",
};

export default async function VerificationPage() {
  const session = await requireRole("provider");
  await connectDB();
  const [profile, requests] = await Promise.all([
    ProviderProfile.findOne({ userId: session.user.id }).select("verification").lean(),
    VerificationRequest.find({ userId: session.user.id }).sort({ submittedAt: -1 }).limit(3).lean(),
  ]);

  const status = (profile?.verification?.status as string) ?? "unverified";

  return (
    <div className="space-y-5">
      <PageHeader title="Verification" description="Get the verified badge by submitting your documents." />

      <Card className={status === "verified" ? "border-emerald-500/40 bg-emerald-500/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className={`h-5 w-5 ${status === "verified" ? "text-emerald-500" : "text-primary"}`} />
            Status: <span className="capitalize">{status}</span>
          </CardTitle>
          <CardDescription>{STATUS_TEXT[status]}</CardDescription>
        </CardHeader>
      </Card>

      {status !== "verified" && status !== "pending" && <VerificationForm />}

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {requests.map((r) => (
              <div key={String(r._id)} className="rounded-lg border p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{r.status}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {formatDate(r.submittedAt as Date)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(r.documents ?? []).length} document(s)
                  {r.reviewNotes ? ` — note: ${r.reviewNotes}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
