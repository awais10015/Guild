import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { favoriteSchema } from "@/lib/validations";
import { toggleFavorite, listFavorites } from "@/server/services/provider-service";

export const GET = handle(async () => {
  const session = await requireUser();
  const favorites = await listFavorites(session.user.id);
  return ok(favorites);
});

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  const input = favoriteSchema.parse(await readJson(req));
  const result = await toggleFavorite(session.user.id, input.providerId);
  return ok(result);
});
