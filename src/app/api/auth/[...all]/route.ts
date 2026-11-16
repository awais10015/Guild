import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function route(req: NextRequest) {
  const auth = await getAuth();
  return auth.handler(req);
}

export { route as GET, route as POST };
