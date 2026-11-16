import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireRole, getSession } from "@/lib/guards";
import { serviceSchema } from "@/lib/validations";
import { Service, ProviderProfile, Profession } from "@/models";
import { MAX_SERVICE_LISTINGS } from "@/lib/constants";

export const POST = handle(async (req: NextRequest) => {
  const session = await requireRole("provider");
  const input = serviceSchema.parse(await readJson(req));

  const profile = await ProviderProfile.findOne({ userId: session.user.id });
  if (!profile) throw new ApiError(400, "Complete your provider profile first.");
  if (input.pricingModel === "custom") input.price = null;
  if (input.pricingModel !== "custom" && (input.price == null || input.price < 1)) {
    throw new ApiError(422, "A price is required for non-custom pricing.");
  }

  const count = await Service.countDocuments({ providerId: session.user.id });
  if (count >= MAX_SERVICE_LISTINGS) throw new ApiError(400, `You can publish up to ${MAX_SERVICE_LISTINGS} services.`);

  const profession = await Profession.findById(input.professionId).lean();
  if (!profession) throw new ApiError(422, "Invalid profession.");

  const service = await Service.create({
    providerId: session.user.id,
    providerProfileId: profile._id,
    title: input.title,
    description: input.description,
    categoryId: profession.categoryId,
    professionId: input.professionId,
    images: input.images,
    pricingModel: input.pricingModel,
    price: input.price ?? null,
    currency: "USD",
    durationHours: input.durationHours ?? null,
    usesProfileAreas: true,
    isActive: input.isActive,
  });
  return ok({ id: String(service._id) }, 201);
});

export const GET = handle(async () => {
  const session = await requireRole("provider");
  const services = await Service.find({ providerId: session.user.id }).sort({ createdAt: -1 }).lean();
  return ok(
    services.map((s) => ({
      id: String(s._id),
      title: s.title,
      description: s.description,
      pricingModel: s.pricingModel,
      price: s.price,
      images: s.images,
      isActive: s.isActive,
      professionId: s.professionId,
      stats: s.stats,
      createdAt: s.createdAt,
    })),
  );
});
