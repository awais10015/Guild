import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { getBooking, bookingConversationId } from "@/server/services/booking-service";
import { listQuotationsForBooking } from "@/server/services/quotation-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const booking = await getBooking({ id: session.user.id, role: session.user.role }, id);
  const quotations = await listQuotationsForBooking({ id: session.user.id, role: session.user.role }, id);
  const conversationId = await bookingConversationId(id);
  return ok({
    booking: { ...booking, _id: String((booking as unknown as { _id: unknown })._id) },
    quotations,
    conversationId,
  });
});
