import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { professionSchema } from "@/lib/validations";
import { updateProfession, deleteProfession } from "@/server/services/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  const input = professionSchema.partial().parse(await readJson(req));
  await updateProfession(id, input);
  return ok({ updated: true });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  await deleteProfession(id);
  return ok({ deleted: true });
});
