import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { markReadSchema } from "@/lib/validations";
import { Notification } from "@/models";
import { unreadCount } from "@/server/services/notification-service";

export const GET = handle(async (req: NextRequest) => {
  const session = await requireUser();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const [notifications, unread] = await Promise.all([
    Notification.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(limit).lean(),
    unreadCount(session.user.id),
  ]);
  return ok({
    unread,
    notifications: notifications.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
  });
});

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  const input = markReadSchema.parse(await readJson(req));
  if (input.all) {
    await Notification.updateMany({ userId: session.user.id, readAt: null }, { readAt: new Date() });
  } else if (input.ids?.length) {
    await Notification.updateMany(
      { userId: session.user.id, _id: { $in: input.ids }, readAt: null },
      { readAt: new Date() },
    );
  }
  return ok({ unread: await unreadCount(session.user.id) });
});
