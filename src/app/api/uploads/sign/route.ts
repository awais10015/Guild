import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { cloudinaryEnabled, signUpload } from "@/lib/cloudinary";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const KINDS = ["avatar", "portfolio", "service", "cert", "verification", "booking", "chat"] as const;

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser();
  if (!rateLimit(`upload-sign:${clientIp(req)}`, 30, 60_000)) throw new ApiError(429, "Too many uploads, slow down.");

  const body = (await readJson<{ kind?: string }>(req)) ?? {};
  const kind = KINDS.includes(body.kind as never) ? (body.kind as string) : "misc";

  if (!cloudinaryEnabled) {
    throw new ApiError(
      503,
      "Media storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to enable uploads.",
    );
  }

  return ok(signUpload(String(session.user.id), kind));
});
