import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { decideVerification } from "@/server/services/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireRole("admin");
  const { id } = await ctx.params;
  const body = await readJson<{ action?: string; notes?: string }>(req);
  const decision = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : null;
  if (!decision) throw Object.assign(new Error("Unknown action."), { status: 400 });
  const result = await decideVerification(session.user.id, id, decision, (body.notes ?? "").slice(0, 500));
  return ok(result);
});
