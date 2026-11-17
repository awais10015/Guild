import type { Metadata } from "next";
import { AppChrome } from "@/components/layout/app-chrome";
import { AppMain } from "@/components/layout/app-main";
import { PageHeader } from "@/components/shared/misc";
import { NotificationList } from "@/components/shared/notification-list";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/notifications");
  await connectDB();
  return (
    <AppChrome>
      <AppMain width="md">
        <PageHeader title="Notifications" description="Booking updates, quotations, messages and announcements." />
        <div className="mt-6">
          <NotificationList />
        </div>
        {session.user.role === "customer" && (
          <p className="mt-6 text-xs text-muted-foreground">
            Tip: enable email delivery by configuring SMTP in your <code>.env</code>.
          </p>
        )}
      </AppMain>
    </AppChrome>
  );
}
