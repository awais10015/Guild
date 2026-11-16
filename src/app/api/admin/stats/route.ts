import { handle, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { adminStats } from "@/server/services/dashboard-service";

export const GET = handle(async () => {
  await requireRole("admin");
  const stats = await adminStats();
  return ok(stats);
});
