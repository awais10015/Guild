import { PageHeader } from "@/components/shared/misc";
import { requireRole } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Category, Profession, ProviderProfile } from "@/models";
import { ProviderProfileForm, type ProfileFormValue } from "@/components/provider/profile-form";
import { cityCenter } from "@/lib/geo";
import { defaultCountryForCity, type DayKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProviderProfilePage() {
  const session = await requireRole("provider");
  await connectDB();
  const [categories, professions, profile] = await Promise.all([
    Category.find({ isActive: true }).sort({ order: 1 }).lean(),
    Profession.find({ isActive: true }).sort({ name: 1 }).lean(),
    ProviderProfile.findOne({ userId: session.user.id }).lean(),
  ]);

  const taxonomy = categories.map((c) => ({
    id: String(c._id),
    name: c.name,
    professions: professions
      .filter((p) => String(p.categoryId) === String(c._id))
      .map((p) => ({ id: String(p._id), name: p.name })),
  }));

  const center = cityCenter(profile?.location?.city ?? "London") ?? { lat: 51.5074, lng: -0.1278 };

  const initial: ProfileFormValue = {
    professionalTitle: (profile?.professionalTitle as string) ?? "",
    bio: (profile?.bio as string) ?? "",
    professions: ((profile?.professions ?? []) as unknown as string[]).map(String),
    skills: ((profile?.skills ?? []) as string[]).join(", "),
    experienceYears: (profile?.experienceYears as number) ?? 0,
    experienceSummary: (profile?.experienceSummary as string) ?? "",
    languages: ((profile?.languages ?? []) as string[]).length ? (profile?.languages as string[]) : ["English"],
    phone: (profile?.phone as string) ?? (session.user.phone ?? ""),
    whatsapp: (profile?.whatsapp as string) ?? "",
    country:
      (profile?.location?.country as string) ||
      defaultCountryForCity((profile?.location?.city as string) ?? "") ||
      "",
    city: (profile?.location?.city as string) ?? "",
    area: (profile?.location?.area as string) ?? "",
    lat: profile?.location?.coordinates?.coordinates?.[1] ?? center.lat,
    lng: profile?.location?.coordinates?.coordinates?.[0] ?? center.lng,
    serviceAreas: ((profile?.serviceAreas ?? []) as { name: string; city: string; radiusKm: number; coordinates?: { coordinates?: number[] } }[]).map((a) => ({
      name: a.name,
      city: a.city,
      lat: a.coordinates?.coordinates?.[1] ?? center.lat,
      lng: a.coordinates?.coordinates?.[0] ?? center.lng,
      radiusKm: a.radiusKm ?? 10,
    })),
    workingHours: ((profile?.workingHours ?? {}) as Partial<Record<DayKey, { start: string; end: string }[] | null>>),
    isAvailable: profile?.isAvailable ?? true,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Public profile"
        description={profile?.slug ? `guild.app/professionals/${profile.slug}` : "Your storefront — customers see exactly this."}
      />
      <ProviderProfileForm
        taxonomy={taxonomy}
        initial={initial}
        portfolio={((profile?.portfolio ?? []) as { url: string; publicId?: string | null; caption?: string }[])}
        certifications={((profile?.certifications ?? []) as { title: string; issuer?: string; year?: number | null }[])}
      />
    </div>
  );
}
