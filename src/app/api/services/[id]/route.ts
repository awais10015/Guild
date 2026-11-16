import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { serviceSchema } from "@/lib/validations";
import { Service, Booking, Profession } from "@/models";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnService(userId: string, id: string) {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) throw new ApiError(400, "Invalid service id.");
  const service = await Service.findById(id);
  if (!service) throw new ApiError(404, "Service not found.");
  if (service.providerId !== userId) throw new ApiError(403, "This is not your service.");
  return service;
}

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireRole("provider");
  const { id } = await ctx.params;
  const service = await getOwnService(session.user.id, id);
  const input = serviceSchema.partial().parse(await readJson(req));

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.images !== undefined) patch.images = input.images;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (input.durationHours !== undefined) patch.durationHours = input.durationHours;
  if (input.pricingModel !== undefined) {
    patch.pricingModel = input.pricingModel;
    patch.price = input.pricingModel === "custom" ? null : (input.price ?? service.price);
  } else if (input.price !== undefined) {
    patch.price = input.price;
  }
  if (input.professionId !== undefined && input.professionId !== String(service.professionId)) {
    const profession = await Profession.findById(input.professionId).lean();
    if (!profession) throw new ApiError(422, "Invalid profession.");
    patch.professionId = input.professionId;
    patch.categoryId = profession.categoryId;
  }

  await Service.updateOne({ _id: service._id }, { $set: patch });
  return ok({ updated: true });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireRole("provider");
  const { id } = await ctx.params;
  const service = await getOwnService(session.user.id, id);
  const bookings = await Booking.countDocuments({ serviceId: service._id });
  if (bookings > 0) {
    /* keep history intact — deactivate instead of deleting */
    await Service.updateOne({ _id: service._id }, { $set: { isActive: false } });
    return ok({ deactivated: true });
  }
  await Service.deleteOne({ _id: service._id });
  return ok({ deleted: true });
});
