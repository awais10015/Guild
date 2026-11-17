import type { NextRequest } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/guards";
import { onboardingSchema } from "@/lib/validations";
import { User, CustomerProfile, ProviderProfile, Profession } from "@/models";
import { upsertProviderProfile } from "@/server/services/provider-service";
import { cityCenter } from "@/lib/geo";
import { defaultCountryForCity } from "@/lib/constants";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ApiError } from "@/lib/api";
import { connectDB } from "@/lib/db";

export const POST = handle(async (req: NextRequest) => {
  await connectDB();
  const session = await requireUser();
  if (!rateLimit(`onboarding:${clientIp(req)}`, 10, 60_000)) {
    throw new ApiError(429, "Too many attempts. Try again in a minute.");
  }

  const input = onboardingSchema.parse(await readJson(req));
  const userId = session.user.id;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User record missing.");

  if (input.role === "customer") {
    await User.updateOne({ _id: userId }, { $set: { phone: input.phone } });
    await CustomerProfile.updateOne(
      { userId },
      {
        $set: {
          defaultPhone: input.phone,
          address: {
            label: "Home",
            country: input.country ?? defaultCountryForCity(input.city) ?? "",
            city: input.city,
            area: input.area ?? "",
            streetAddress: "",
          },
        },
      },
      { upsert: true },
    );
    return ok({ redirect: "/dashboard" });
  }

  /* provider onboarding */
  if (user.role === "admin") throw new ApiError(403, "Administrators cannot become service providers.");
  if (user.role === "provider" && (await ProviderProfile.exists({ userId }))) {
    throw new ApiError(409, "You already have a provider profile.");
  }
  const professions = await Profession.find({ _id: { $in: input.professions } }).lean();
  if (professions.length !== input.professions.length) {
    throw new ApiError(422, "Invalid profession selection.");
  }

  await User.updateOne({ _id: userId }, { $set: { role: "provider", phone: input.phone } });
  const country = input.country ?? defaultCountryForCity(input.city) ?? "International";
  const center = input.coordinates ?? cityCenter(input.city, country) ?? cityCenter(input.city) ?? { lat: 0, lng: 0 };
  await upsertProviderProfile(userId, user.name ?? "Professional", {
    professionalTitle: input.professionalTitle,
    bio: input.bio || `I am a ${input.professionalTitle} serving ${input.city}. Contact me through Guild for details and quotations.`,
    professions: input.professions,
    skills: [],
    experienceYears: 1,
    experienceSummary: "",
    languages: ["English"],
    phone: input.phone,
    whatsapp: input.phone,
    location: { country, city: input.city, area: input.area ?? "", lat: center.lat, lng: center.lng },
    serviceAreas: [{ name: input.area || input.city, city: input.city, lat: center.lat, lng: center.lng, radiusKm: 10 }],
    workingHours: {},
    isAvailable: true,
  });

  return ok({ redirect: "/provider" });
});
