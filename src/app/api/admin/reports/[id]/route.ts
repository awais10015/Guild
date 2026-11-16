import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { handleReport } from "@/server/services/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireRole("admin");
  const { id } = await ctx.params;
  const body = await readJson<{ action?: string; note?: string }>(req);
  const action = body.action as "investigating" | "resolved" | "dismissed";
  if (!["investigating", "resolved", "dismissed"].includes(action)) {
    throw Object.assign(new Error("Unknown action."), { status: 400 });
  }
  await handleReport(session.user.id, id, action, (body.note ?? "").slice(0, 500));
  return ok({ handled: true });
});
