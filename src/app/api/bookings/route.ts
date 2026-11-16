import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { bookingCreateSchema } from "@/lib/validations";
import { createBooking, listBookings } from "@/server/services/booking-service";
import { isBookingStatus, type BookingStatus } from "@/lib/constants";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  if (!rateLimit(`booking-create:${clientIp(req)}`, 10, 60_000)) {
    throw Object.assign(new Error("Too many requests."), { status: 429 });
  }
  const input = bookingCreateSchema.parse(await readJson(req));
  const booking = await createBooking(
    { id: session.user.id, role: session.user.role },
    input,
  );
  return ok({ id: String((booking as { _id: unknown })._id), bookingNumber: (booking as { bookingNumber: string }).bookingNumber }, 201);
});

export const GET = handle(async (req: NextRequest) => {
  const session = await requireUser();
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status = statusParam && isBookingStatus(statusParam) ? (statusParam as BookingStatus) : undefined;
  const bookings = await listBookings({ id: session.user.id, role: session.user.role }, status);
  return ok(bookings);
});
