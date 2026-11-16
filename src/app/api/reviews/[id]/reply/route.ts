import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { reviewReplySchema } from "@/lib/validations";
import { replyToReview } from "@/server/services/review-service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const input = reviewReplySchema.parse(await readJson(req));
  await replyToReview({ id: session.user.id, role: session.user.role }, id, input.body);
  return ok({ replied: true });
});
