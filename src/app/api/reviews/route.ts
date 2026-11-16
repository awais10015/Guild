import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { reviewSchema } from "@/lib/validations";
import { submitReview } from "@/server/services/review-service";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  if (!rateLimit(`review:${clientIp(req)}`, 10, 60_000)) {
    throw Object.assign(new Error("Too many requests."), { status: 429 });
  }
  const input = reviewSchema.parse(await readJson(req));
  const review = await submitReview({ id: session.user.id, role: session.user.role }, input);
  return ok({ id: String(review._id) }, 201);
});
