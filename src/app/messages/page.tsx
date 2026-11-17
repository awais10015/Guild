import type { Metadata } from "next";
import { AppChrome } from "@/components/layout/app-chrome";
import { AppMain } from "@/components/layout/app-main";
import { MessagesView } from "@/components/messaging/messages-view";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/messages");
  await connectDB();
  return (
    <AppChrome>
      <AppMain width="xl">
        <MessagesView currentUserId={session.user.id} />
      </AppMain>
    </AppChrome>
  );
}
