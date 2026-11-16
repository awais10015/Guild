import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { reportSchema } from "@/lib/validations";
import { Report } from "@/models";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  if (!rateLimit(`report:${clientIp(req)}`, 10, 300_000)) {
    throw Object.assign(new Error("Too many reports."), { status: 429 });
  }
  const input = reportSchema.parse(await readJson(req));
  await Report.create({
    reporterId: session.user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    description: input.description,
  });
  return ok({ submitted: true }, 201);
});
