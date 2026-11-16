import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { providerProfileSchema } from "@/lib/validations";
import { User } from "@/models";
import { upsertProviderProfile, setPortfolio, addCertifications } from "@/server/services/provider-service";

export const PUT = handle(async (req: NextRequest) => {
  const session = await requireRole("provider");
  const body = await readJson<{
    profile?: unknown;
    portfolio?: { url: string; publicId?: string | null; caption?: string }[];
    certifications?: { title: string; issuer?: string; year?: number | null; documentUrl?: string | null }[];
  }>(req);

  const user = await User.findById(session.user.id).select("name");
  if (!user) throw new ApiError(404, "User not found.");

  if (body.profile) {
    const input = providerProfileSchema.parse(body.profile);
    await upsertProviderProfile(session.user.id, user.name ?? "Professional", input);
  }
  if (Array.isArray(body.portfolio)) {
    await setPortfolio(session.user.id, body.portfolio.filter((p) => typeof p.url === "string").slice(0, 20));
  }
  if (Array.isArray(body.certifications)) {
    await addCertifications(session.user.id, body.certifications.slice(0, 10));
  }
  return ok({ saved: true });
});
