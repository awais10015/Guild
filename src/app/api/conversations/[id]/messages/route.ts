import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { sendMessageSchema } from "@/lib/validations";
import { getMessages } from "@/server/services/conversation-service";
import { sendMessage } from "@/server/services/message-service";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ApiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const messages = await getMessages(id, session.user.id);
  return ok(messages);
});

export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  if (!rateLimit(`msg-send:${session.user.id}`, 30, 60_000)) {
    throw new ApiError(429, "You are sending messages too quickly. Please slow down.");
  }
  const { id } = await ctx.params;
  const input = sendMessageSchema.parse(await readJson(req));
  const message = await sendMessage(id, session.user.id, {
    type: input.type,
    body: input.body ?? "",
    attachment: input.attachment ?? null,
  });
  return ok(message);
});
