import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { markConversationRead } from "@/server/services/message-service";

type Ctx = { params: Promise<{ id: string }> };

/** Mark the conversation as read for the current user (also fires a realtime event). */
export const POST = handle(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  await markConversationRead(id, session.user.id);
  return ok({ read: true });
});
