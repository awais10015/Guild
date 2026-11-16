import { PageHeader } from "@/components/shared/misc";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { ProviderProfile } from "@/models";
import { AvailabilityEditor } from "@/components/provider/availability-editor";
import type { DayKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const session = await requireRole("provider");
  await connectDB();
  const profile = await ProviderProfile.findOne({ userId: session.user.id }).select("workingHours isAvailable").lean();
  if (!profile) {
    return <p className="text-sm text-muted-foreground">Complete your profile first from the Public profile page.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Availability" description="Control when customers can expect you to accept work." />
      <AvailabilityEditor
        initialHours={((profile.workingHours ?? {}) as Partial<Record<DayKey, { start: string; end: string }[] | null>>)}
        initialAvailable={!!profile.isAvailable}
      />
    </div>
  );
}
