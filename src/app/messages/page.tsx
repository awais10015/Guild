import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { MessagesView } from "@/components/messaging/messages-view";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSession();
  await connectDB();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <MessagesView currentUserId={session!.user.id} />
      </div>
    </div>
  );
}
