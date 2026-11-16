import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, readJson, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { assertParticipant } from "@/server/services/conversation-service";
import { pusherEnabled, authorizeChannel, channels } from "@/lib/pusher";

/**
 * Pusher channel authorization endpoint.
 * Users may only subscribe to:
 * - their own `private-user-<id>` channel
 * - conversation channels they participate in
 */
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  if (!pusherEnabled()) throw new ApiError(503, "Realtime messaging is not configured.");

  /* pusher-js posts the auth request form-encoded; accept JSON too for tests */
  const contentType = req.headers.get("content-type") ?? "";
  let socketId = "";
  let channelName = "";
  if (contentType.includes("application/json")) {
    const body = (await readJson<{ socket_id?: string; channel_name?: string }>(req)) ?? {};
    socketId = body.socket_id ?? "";
    channelName = body.channel_name ?? "";
  } else {
    const form = await req.formData();
    socketId = String(form.get("socket_id") ?? "");
    channelName = String(form.get("channel_name") ?? "");
  }
  if (!socketId || !channelName) throw new ApiError(400, "Missing Pusher auth payload.");

  const userId = session.user.id;

  if (channelName === channels.user(userId)) {
    return NextResponse.json(
      authorizeChannel(socketId, channelName, {
        user_id: userId,
        user_info: { name: session.user.name ?? "User", image: session.user.image ?? null },
      }),
    );
  }

  const convPrefix = "presence-conversation-";
  if (channelName.startsWith(convPrefix)) {
    const conversationId = channelName.slice(convPrefix.length);
    await assertParticipant(conversationId, userId);
    return NextResponse.json(
      authorizeChannel(socketId, channelName, {
        user_id: userId,
        user_info: { name: session.user.name ?? "User", image: session.user.image ?? null },
      }),
    );
  }

  throw new ApiError(403, "You are not allowed to subscribe to this channel.");
});
