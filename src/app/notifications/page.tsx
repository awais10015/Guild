import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { PageHeader } from "@/components/shared/misc";
import { NotificationList } from "@/components/shared/notification-list";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  await connectDB();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader title="Notifications" description="Booking updates, quotations, messages and announcements." />
        <div className="mt-6">
          <NotificationList />
        </div>
        {session?.user.role === "customer" && (
          <p className="mt-6 text-xs text-muted-foreground">
            Tip: enable email delivery by configuring SMTP in your <code>.env</code>.
          </p>
        )}
      </div>
    </div>
  );
}
