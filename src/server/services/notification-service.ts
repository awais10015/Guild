import { Notification, type NotificationDoc } from "@/models/notification";
import { sendMail, mailEnabled } from "@/lib/mail";
import { triggerToUser } from "@/lib/pusher";
import type { NotificationType } from "@/lib/constants";

interface EmitInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  email?: string;
}

/** Push a realtime notification to the user's private Pusher channel (best-effort). */
async function pushRealtime(userId: string, notification: Partial<NotificationDoc> & { _id?: unknown }) {
  await triggerToUser(userId, "notification:new", {
    id: String(notification._id ?? ""),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    createdAt: (notification.createdAt ?? new Date()).toISOString(),
  });
}

/**
 * Single entry point for notifications:
 * 1. persist in-app notification
 * 2. push over Socket.IO (if online)
 * 3. email (transactional types only, best-effort)
 */
export async function emitNotification(input: EmitInput): Promise<void> {
  try {
    const doc = await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      data: input.data ?? {},
    });
    void pushRealtime(input.userId, doc.toObject());
    if (input.email) {
      await sendMail({
        to: input.email,
        subject: `[Guild] ${input.title}`,
        text: `${input.body ?? ""}\n\n— Guild\nOpen ${process.env.NEXT_PUBLIC_APP_URL ?? ""} to see more.`,
      });
      await Notification.updateOne({ _id: doc._id }, { emailSentAt: new Date() });
    }
  } catch (err) {
    console.error("[notification] emit failed:", err);
  }
}

export async function unreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, readAt: null });
}

export { mailEnabled };
