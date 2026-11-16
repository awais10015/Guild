import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { quotationCreateSchema } from "@/lib/validations";
import { sendQuotation } from "@/server/services/quotation-service";

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  const input = quotationCreateSchema.parse(await readJson(req));
  const quotation = await sendQuotation({ id: session.user.id, role: session.user.role }, input);
  return ok({ id: String(quotation._id), totalAmount: quotation.totalAmount }, 201);
});
