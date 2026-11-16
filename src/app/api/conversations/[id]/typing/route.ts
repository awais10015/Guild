import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { typingSchema } from "@/lib/validations";
import { signalTyping } from "@/server/services/message-service";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** Relay a typing indicator to the other participant through Pusher. */
export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  if (rateLimit(`typing:${session.user.id}`, 60, 60_000)) {
    const { id } = await ctx.params;
    const { isTyping } = typingSchema.parse(await readJson(req));
    await signalTyping(id, session.user.id, isTyping);
  }
  return ok({ sent: true });
});
