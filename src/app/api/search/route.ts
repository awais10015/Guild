import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api";
import { searchQuerySchema } from "@/lib/validations";
import { searchProviders } from "@/server/services/search-service";
import { getSession } from "@/lib/guards";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const GET = handle(async (req: NextRequest) => {
  if (!rateLimit(`search:${clientIp(req)}`, 60, 60_000)) {
    return ok({ items: [], total: 0, page: 1, pages: 0 });
  }
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const params = searchQuerySchema.parse(raw);
  const session = await getSession();
  const result = await searchProviders(params);
  return ok(result);
});
