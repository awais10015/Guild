import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { professionSchema } from "@/lib/validations";
import { createProfession } from "@/server/services/admin-service";

export const POST = handle(async (req: NextRequest) => {
  await requireRole("admin");
  const input = professionSchema.parse(await readJson(req));
  const profession = await createProfession(input);
  return ok({ id: String(profession._id) }, 201);
});
