import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { ProviderProfile } from "@/models";

const hoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.array(z.object({ start: z.string().min(4), end: z.string().min(4) })).max(2).nullable(),
);

const bodySchema = z.object({
  isAvailable: z.boolean(),
  workingHours: hoursSchema,
});

export const PUT = handle(async (req: NextRequest) => {
  const session = await requireRole("provider");
  const input = bodySchema.parse(await readJson(req));
  const result = await ProviderProfile.updateOne(
    { userId: session.user.id },
    { $set: { isAvailable: input.isAvailable, workingHours: input.workingHours } },
  );
  return ok({ saved: result.matchedCount > 0 });
});
