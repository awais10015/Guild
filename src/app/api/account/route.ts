import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { accountSchema } from "@/lib/validations";
import { User, CustomerProfile } from "@/models";

export const GET = handle(async () => {
  const session = await requireUser();
  const user = await User.findById(session.user.id).select("name email phone role image emailVerified").lean();
  if (!user) throw new ApiError(404, "User not found.");
  const profile = await CustomerProfile.findOne({ userId: session.user.id }).lean();
  return ok({
    user: {
      name: user.name,
      email: user.email,
      phone: (user.phone as string) ?? "",
      role: user.role,
      image: (user.image as string | null) ?? null,
      emailVerified: user.emailVerified,
    },
    address: profile?.address ?? null,
  });
});

export const PATCH = handle(async (req: NextRequest) => {
  const session = await requireUser();
  const input = accountSchema.parse(await readJson(req));

  const userPatch: Record<string, unknown> = {};
  if (input.name) userPatch.name = input.name;
  if (input.phone) userPatch.phone = input.phone;
  if (Object.keys(userPatch).length) {
    await User.updateOne({ _id: session.user.id }, { $set: userPatch });
  }

  if (input.address) {
    await CustomerProfile.updateOne(
      { userId: session.user.id },
      { $set: { defaultPhone: input.phone ?? "", address: { label: input.address.label ?? "Home", ...input.address } } },
      { upsert: true },
    );
  } else if (input.phone && session.user.role === "customer") {
    await CustomerProfile.updateOne({ userId: session.user.id }, { $set: { defaultPhone: input.phone } }, { upsert: true });
  }

  return ok({ updated: true });
});
