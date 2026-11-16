import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { moderateReview } from "@/server/services/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireRole("admin");
  const { id } = await ctx.params;
  const body = await readJson<{ action?: string; reason?: string }>(req);
  const action = body.action as "hide" | "unhide" | "flag";
  if (!["hide", "unhide", "flag"].includes(action)) {
    throw Object.assign(new Error("Unknown action."), { status: 400 });
  }
  await moderateReview(session.user.id, id, action, (body.reason ?? "").slice(0, 300));
  return ok({ moderated: true });
});
