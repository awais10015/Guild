import {
  Booking,
  Favorite,
  Profession,
  ProviderProfile,
  Review,
  Service,
  User,
  type ProviderProfileDoc,
} from "@/models";
import { ApiError } from "@/lib/api";
import { toGeoJSONPoint } from "@/lib/geo";
import { slugify, randomSuffix } from "@/lib/text";
import type * as S from "@/lib/validations";
import type { z } from "zod";
import { eligibleBookingForReview } from "./review-service";

/* ---------------- public profile ---------------- */

export interface PublicProfile {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  professionalTitle: string;
  bio: string;
  professions: { id: string; name: string; slug: string }[];
  skills: string[];
  experienceYears: number;
  experienceSummary: string;
  languages: string[];
  phone: string;
  whatsapp: string;
  city: string;
  area: string;
  serviceAreas: { name: string; city: string; radiusKm: number }[];
  workingHours: Record<string, { start: string; end: string }[] | null>;
  isAvailable: boolean;
  verificationStatus: string;
  rating: { average: number; count: number };
  stats: { profileViews: number; completedJobs: number };
  portfolio: { url: string; caption: string }[];
  certifications: { title: string; issuer: string; year?: number | null }[];
  memberSince: Date;
}

function toPublicProfile(profile: ProviderProfileDoc, user: { name?: string; image?: string | null } | null): PublicProfile {
  return {
    id: String((profile as unknown as { _id: unknown })._id),
    slug: profile.slug,
    name: user?.name ?? profile.displayName,
    image: (user?.image as string | null) ?? null,
    professionalTitle: profile.professionalTitle,
    bio: profile.bio,
    professions: (profile.professions as unknown as { _id: unknown; name: string; slug: string }[]).map((p) => ({
      id: String(p._id),
      name: p.name,
      slug: p.slug,
    })),
    skills: (profile.skills as string[]) ?? [],
    experienceYears: profile.experienceYears ?? 0,
    experienceSummary: profile.experienceSummary ?? "",
    languages: (profile.languages as string[]) ?? [],
    phone: (profile.phone as string) ?? "",
    whatsapp: (profile.whatsapp as string) ?? "",
    city: profile.location?.city ?? "",
    area: profile.location?.area ?? "",
    serviceAreas: (profile.serviceAreas ?? []).map((a) => ({
      name: a.name,
      city: a.city,
      radiusKm: a.radiusKm,
    })),
    workingHours: (profile.workingHours ?? {}) as PublicProfile["workingHours"],
    isAvailable: !!profile.isAvailable,
    verificationStatus: profile.verification?.status ?? "unverified",
    rating: {
      average: Math.round((profile.rating?.average ?? 0) * 10) / 10,
      count: profile.rating?.count ?? 0,
    },
    stats: {
      profileViews: profile.stats?.profileViews ?? 0,
      completedJobs: profile.stats?.completedJobs ?? 0,
    },
    portfolio: (profile.portfolio ?? []).map((p) => ({ url: p.url, caption: p.caption ?? "" })),
    certifications: (profile.certifications ?? []).map((c) => ({
      title: c.title,
      issuer: c.issuer ?? "",
      year: c.year ?? null,
    })),
    memberSince: (profile.createdAt ?? new Date()) as Date,
  };
}

export async function getPublicProfileBySlug(slug: string, viewerId?: string) {
  const profile = await ProviderProfile.findOne({ slug })
    .populate("professions", "name slug")
    .lean<ProviderProfileDoc & { professions: unknown }>();
  if (!profile) return null;

  const user = await User.findById(profile.userId).select("name image").lean();
  const publicProfile = toPublicProfile(profile, user);

  const services = await Service.find({ providerProfileId: (profile as unknown as { _id: unknown })._id, isActive: true })
    .sort({ createdAt: 1 })
    .lean();

  const reviews = await Review.find({ providerId: profile.userId, "moderation.status": "visible" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const reviewerIds = reviews.map((r) => r.customerId as string);
  const reviewers = reviewerIds.length
    ? await User.find({ _id: { $in: reviewerIds } }).select("name image").lean()
    : [];
  const reviewerMap = new Map(reviewers.map((u) => [String(u._id), u]));

  let favorite = false;
  let eligibleBookingId: string | null = null;
  if (viewerId && viewerId !== profile.userId) {
    favorite = !!(await Favorite.exists({ customerId: viewerId, providerId: profile.userId }));
    const booking = await eligibleBookingForReview(viewerId, profile.userId);
    eligibleBookingId = booking ? String(booking._id) : null;
  }

  return {
    profile: publicProfile,
    userId: profile.userId as string,
    services: services.map((s) => ({
      id: String(s._id),
      title: s.title,
      description: s.description,
      images: (s.images ?? []) as { url: string }[],
      pricingModel: s.pricingModel as string,
      price: (s.price as number | null) ?? null,
      durationHours: (s.durationHours as number | null) ?? null,
    })),
    reviews: reviews.map((r) => {
      const reviewer = reviewerMap.get(r.customerId as string);
      return {
        id: String(r._id),
        author: reviewer?.name ?? "Customer",
        authorImage: (reviewer?.image as string | null) ?? null,
        ratings: r.ratings,
        comment: r.comment,
        images: (r.images ?? []) as { url: string }[],
        providerReply: r.providerReply?.body
          ? { body: r.providerReply.body as string, at: r.providerReply.at as Date }
          : null,
        createdAt: r.createdAt as Date,
      };
    }),
    isFavorite: favorite,
    eligibleBookingId,
  };
}

/* ---------------- provider self profile ---------------- */

export async function getMyProviderProfile(userId: string) {
  return ProviderProfile.findOne({ userId }).populate("professions", "name slug").lean();
}

async function buildSlug(name: string, city: string): Promise<string> {
  const base = `${slugify(name || "pro")}-${slugify(city || "worldwide")}`.replace(/^-+|-+$/g, "");
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${randomSuffix()}`;
    if (!(await ProviderProfile.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function upsertProviderProfile(
  userId: string,
  userName: string,
  input: z.infer<typeof S.providerProfileSchema>,
) {
  const professions = await Profession.find({ _id: { $in: input.professions } }).lean();
  if (professions.length !== input.professions.length) {
    throw new ApiError(422, "One or more selected professions are invalid.");
  }
  const categoryIds = [...new Set(professions.map((p) => String(p.categoryId)))];

  const existing = await ProviderProfile.findOne({ userId });
  const payload = {
    displayName: userName,
    professionalTitle: input.professionalTitle,
    bio: input.bio,
    professions: input.professions,
    categoryIds,
    skills: input.skills,
    experienceYears: input.experienceYears,
    experienceSummary: input.experienceSummary ?? "",
    languages: input.languages,
    phone: input.phone,
    whatsapp: input.whatsapp ?? "",
    location: {
      country: input.location.country,
      city: input.location.city,
      area: input.location.area ?? "",
      coordinates: toGeoJSONPoint({ lat: input.location.lat, lng: input.location.lng }),
    },
    serviceAreas: input.serviceAreas.map((a) => ({
      name: a.name,
      city: a.city,
      radiusKm: a.radiusKm,
      coordinates: toGeoJSONPoint({ lat: a.lat, lng: a.lng }),
    })),
    workingHours: input.workingHours ?? {},
    isAvailable: input.isAvailable,
  };

  if (!existing) {
    const slug = await buildSlug(userName, input.location.city);
    return ProviderProfile.create({ userId, slug, ...payload });
  }
  return ProviderProfile.updateOne({ _id: existing._id }, { $set: payload });
}

export async function setPortfolio(
  userId: string,
  portfolio: { url: string; publicId?: string | null; caption?: string }[],
) {
  const profile = await ProviderProfile.findOne({ userId });
  if (!profile) throw new ApiError(404, "Create your profile first.");
  await ProviderProfile.updateOne(
    { _id: profile._id },
    { $set: { portfolio: portfolio.map((p, i) => ({ ...p, caption: p.caption ?? "", order: i })) } },
  );
}

export async function addCertifications(
  userId: string,
  certifications: { title: string; issuer?: string; year?: number | null; documentUrl?: string | null }[],
) {
  const profile = await ProviderProfile.findOne({ userId });
  if (!profile) throw new ApiError(404, "Create your profile first.");
  await ProviderProfile.updateOne({ _id: profile._id }, { $set: { certifications } });
}

export async function incrementViews(profileId: string) {
  await ProviderProfile.updateOne({ _id: profileId }, { $inc: { "stats.profileViews": 1 } });
}

/* ---------------- favorites ---------------- */

export async function toggleFavorite(customerId: string, providerId: string) {
  const provider = await ProviderProfile.findOne({ userId: providerId });
  if (!provider) throw new ApiError(404, "Provider not found.");
  const existing = await Favorite.findOne({ customerId, providerId });
  if (existing) {
    await Favorite.deleteOne({ _id: existing._id });
    return { favorited: false };
  }
  await Favorite.create({ customerId, providerId });
  return { favorited: true };
}

export async function listFavorites(customerId: string) {
  const favs = await Favorite.find({ customerId }).sort({ createdAt: -1 }).lean();
  const providerIds = favs.map((f) => f.providerId as string);
  const profiles = await ProviderProfile.find({ userId: { $in: providerIds } })
    .populate("professions", "name")
    .lean();
  const users = await User.find({ _id: { $in: providerIds } }).select("name image").lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const byUser = new Map(profiles.map((p) => [p.userId as string, p]));
  return providerIds
    .map((pid) => {
      const p = byUser.get(pid);
      if (!p) return null;
      const u = userMap.get(pid);
      return {
        userId: pid,
        slug: p.slug,
        name: u?.name ?? p.displayName,
        image: (u?.image as string | null) ?? null,
        professionalTitle: p.professionalTitle,
        city: p.location?.city ?? "",
        rating: p.rating,
        verificationStatus: p.verification?.status ?? "unverified",
        professions: (p.professions as unknown as { name: string }[]).map((x) => x.name),
      };
    })
    .filter(Boolean);
}
