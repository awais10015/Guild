import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { quotationRespondSchema } from "@/lib/validations";
import { respondQuotation } from "@/server/services/quotation-service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const input = quotationRespondSchema.parse(await readJson(req));
  const result = await respondQuotation({ id: session.user.id, role: session.user.role }, id, input.action);
  return ok(result);
});
