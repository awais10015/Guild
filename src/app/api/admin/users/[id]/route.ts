import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { setProviderSuspension, banUser, unbanUser } from "@/server/services/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireRole("admin");
  const { id } = await ctx.params;
  const body = await readJson<{ action?: string; reason?: string }>(req);
  const action = body.action ?? "";
  const reason = (body.reason ?? "").slice(0, 300);

  switch (action) {
    case "ban":
      if (!reason) throw new ApiError(422, "A reason is required to suspend an account.");
      await banUser(session.user.id, id, reason);
      return ok({ banned: true });
    case "unban":
      await unbanUser(id);
      return ok({ banned: false });
    case "suspend-provider":
      await setProviderSuspension(id, true);
      return ok({ suspended: true });
    case "unsuspend-provider":
      await setProviderSuspension(id, false);
      return ok({ suspended: false });
    default:
      throw new ApiError(400, "Unknown action.");
  }
});
