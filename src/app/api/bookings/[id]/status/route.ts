import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { bookingStatusSchema } from "@/lib/validations";
import { transitionBooking } from "@/server/services/booking-service";
import { rateLimit, clientIp } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireUser();
  if (!rateLimit(`booking-status:${clientIp(req)}`, 30, 60_000)) {
    throw Object.assign(new Error("Too many requests."), { status: 429 });
  }
  const { id } = await ctx.params;
  const input = bookingStatusSchema.parse(await readJson(req));
  const booking = await transitionBooking(
    { id: session.user.id, role: session.user.role },
    id,
    input.status,
    input.note ?? "",
  );
  return ok({ status: booking.status, history: booking.statusHistory });
});
