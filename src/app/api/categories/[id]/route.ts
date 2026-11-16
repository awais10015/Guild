import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { categorySchema } from "@/lib/validations";
import { updateCategory, deleteCategory } from "@/server/services/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  const input = categorySchema.partial().parse(await readJson(req));
  await updateCategory(id, input);
  return ok({ updated: true });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  await deleteCategory(id);
  return ok({ deleted: true });
});
