import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { suggestProfessionSchema } from "@/lib/validations";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { findOrCreateProfession } from "@/server/services/admin-service";
import { connectDB } from "@/lib/db";

export const POST = handle(async (req: NextRequest) => {
  await connectDB();
  const session = await requireUser();
  if (session.user.role === "admin") {
    throw new ApiError(403, "Use the admin console to manage taxonomy.");
  }
  if (!rateLimit(`profession-suggest:${clientIp(req)}`, 15, 60_000)) {
    throw new ApiError(429, "Too many attempts. Try again in a minute.");
  }

  const input = suggestProfessionSchema.parse(await readJson(req));
  const { profession, created } = await findOrCreateProfession(input);

  return ok({
    id: String(profession._id),
    name: profession.name,
    categoryId: String(profession.categoryId),
    created,
  });
});