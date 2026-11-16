import type { NextRequest } from "next/server";
import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { categorySchema } from "@/lib/validations";
import { Category, Profession } from "@/models";
import { createCategory } from "@/server/services/admin-service";

export const GET = handle(async () => {
  const [categories, professions] = await Promise.all([
    Category.find({ isActive: true }).sort({ order: 1, name: 1 }).lean(),
    Profession.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);
  return ok(
    categories.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      description: c.description,
      professions: professions
        .filter((p) => String(p.categoryId) === String(c._id))
        .map((p) => ({ id: String(p._id), name: p.name, slug: p.slug, keywords: p.keywords })),
    })),
  );
});

export const POST = handle(async (req: NextRequest) => {
  await requireRole("admin");
  const input = categorySchema.parse(await readJson(req));
  const category = await createCategory(input);
  return ok({ id: String(category._id) }, 201);
});
