import { Profession, Category, ProviderProfile, Service, type ProviderProfileDoc } from "@/models";
import { escapeRegExp, uniqueSortedCities } from "@/lib/text";
import { PAGE_SIZE } from "@/lib/constants";
import { cityCenter } from "@/lib/geo";
import type * as S from "@/lib/validations";
import type { z } from "zod";

export type SearchParams = z.infer<typeof S.searchQuerySchema>;

export interface SearchResultItem {
  userId: string;
  slug: string;
  name: string;
  image: string | null;
  professionalTitle: string;
  bio: string;
  city: string;
  area: string;
  professions: string[];
  skills: string[];
  experienceYears: number;
  verificationStatus: string;
  isAvailable: boolean;
  rating: { average: number; count: number };
  completedJobs: number;
  minPrice: number | null;
  pricingModels: string[];
  topServices: { id: string; title: string; pricingModel: string; price: number | null }[];
  distanceKm: number | null;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  pages: number;
}

export async function searchProviders(params: SearchParams): Promise<SearchResult> {
  const page = params.page ?? 1;
  const limit = PAGE_SIZE;

  /* resolve taxonomy slugs -> ids */
  let professionIds: string[] = [];
  let categoryId: string | null = null;
  if (params.profession) {
    const prof = await Profession.findOne({
      slug: params.profession,
      isActive: true,
    }).lean();
    if (prof) professionIds = [String(prof._id)];
    else return { items: [], total: 0, page, pages: 0 };
  } else if (params.category) {
    const cat = await Category.findOne({ slug: params.category, isActive: true }).lean();
    if (cat) categoryId = String(cat._id);
    else return { items: [], total: 0, page, pages: 0 };
  }
  if (categoryId && professionIds.length === 0) {
    const profs = await Profession.find({ categoryId, isActive: true }).select("_id").lean();
    professionIds = profs.map((p) => String(p._id));
    if (professionIds.length === 0) return { items: [], total: 0, page, pages: 0 };
  }

  /* service-level pre-filter (pricing model / max price) */
  let serviceFilterIds: string[] | null = null;
  const serviceFilter: Record<string, unknown> = { isActive: true };
  if (params.pricingModel) serviceFilter.pricingModel = params.pricingModel;
  if (params.maxPrice) {
    serviceFilter.price = { $ne: null, $lte: params.maxPrice };
    serviceFilter.pricingModel = serviceFilter.pricingModel ?? { $in: ["fixed", "hourly", "starting"] };
  }
  if (params.pricingModel || params.maxPrice) {
    if (professionIds.length) serviceFilter.professionId = { $in: professionIds };
    const docs = await Service.find(serviceFilter).select("providerId").limit(2000).lean();
    serviceFilterIds = [...new Set(docs.map((d) => d.providerId as string))];
    if (serviceFilterIds.length === 0) return { items: [], total: 0, page, pages: 0 };
  }

  const textFilter: Record<string, unknown> = params.q
    ? { $text: { $search: params.q, $caseSensitive: false } }
    : {};

  const baseMatch: Record<string, unknown> = {
    isSuspended: false,
    ...textFilter,
  };
  if (params.verified) baseMatch["verification.status"] = "verified";
  if (params.available) baseMatch.isAvailable = true;
  if (params.minRating) baseMatch["rating.average"] = { $gte: params.minRating };
  if (params.minExperience) baseMatch.experienceYears = { $gte: params.minExperience };
  if (professionIds.length) baseMatch.professions = { $in: professionIds };

  const useGeo = params.lat != null && params.lng != null;
  const radius = (params.radiusKm ?? 25) * 1000;

  /* $geoNear must be the first stage */
  const geoNear = {
    $geoNear: {
      near: { type: "Point", coordinates: [params.lng!, params.lat!] },
      distanceField: "distanceKm",
      maxDistance: radius,
      spherical: true,
      query: baseMatch,
      key: "serviceAreas.coordinates",
    },
  };

  /* city filter (non-geo path): matches registered city OR any service area city */
  let cityMatch: Record<string, unknown> = {};
  if (params.city && !useGeo) {
    const cityRegex = new RegExp(`^${escapeRegExp(params.city)}$`, "i");
    cityMatch = {
      $or: [{ "location.city": cityRegex }, { "serviceAreas.city": cityRegex }],
    };
  } else if (params.area && !useGeo) {
    cityMatch = { $or: [{ "location.area": new RegExp(escapeRegExp(params.area), "i") }, { "serviceAreas.name": new RegExp(escapeRegExp(params.area), "i") }] };
  }

  const servicesLookup = {
    $lookup: {
      from: "services",
      let: { pid: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$providerProfileId", "$$pid"] },
            isActive: true,
            ...(params.pricingModel ? { pricingModel: params.pricingModel } : {}),
            ...(params.maxPrice ? { price: { $ne: null, $lte: params.maxPrice } } : {}),
          },
        },
        { $project: { title: 1, pricingModel: 1, price: 1 } },
        { $sort: { price: 1 as 1 } },
        { $limit: 3 },
      ],
      as: "topServices",
    },
  };

  const serviceMatch =
    params.pricingModel || params.maxPrice
      ? { $match: { "topServices.0": { $exists: true } } }
      : null;

  const minPriceAdd = {
    $addFields: {
      minPrice: {
        $min: {
          $map: {
            input: {
              $filter: {
                input: "$topServices",
                as: "s",
                cond: { $ne: ["$$s.price", null] },
              },
            },
            as: "s",
            in: "$$s.price",
          },
        },
      },
    },
  };

  const sort: Record<string, 1 | -1 | { $meta: string }> =
    params.sort === "relevance" && params.q
      ? { score: { $meta: "textScore" } }
      : params.sort === "nearest" && useGeo
        ? { distanceKm: 1 }
        : params.sort === "price_low"
          ? { minPrice: 1, "rating.average": -1 }
          : params.sort === "experience"
            ? { experienceYears: -1, "rating.average": -1 }
            : params.sort === "reviews"
              ? { "rating.count": -1 }
              : { "rating.average": -1, "rating.count": -1 };

  const facetPipeline: unknown[] = [{ $sort: sort }, { $skip: (page - 1) * limit }, { $limit: limit }];

  const pipeline: unknown[] = useGeo
    ? [geoNear, servicesLookup, ...(serviceMatch ? [serviceMatch] : []), minPriceAdd, { $facet: { items: facetPipeline, total: [{ $count: "count" }] } }]
    : [
        { $match: { ...baseMatch, ...cityMatch } },
        servicesLookup,
        ...(serviceMatch ? [serviceMatch] : []),
        minPriceAdd,
        {
          $facet: {
            items: facetPipeline,
            total: [{ $count: "count" }],
          },
        },
      ];

  if (params.sort === "relevance" && params.q && !useGeo) {
    (pipeline[0] as { $match: Record<string, unknown> }).$match.score = { $meta: "textScore" };
  }

  const result = (await ProviderProfile.aggregate(pipeline as never)) as unknown as {
    items: (ProviderProfileDoc & { distanceKm?: number; minPrice?: number | null; topServices: { _id: unknown; title: string; pricingModel: string; price: number | null }[] })[];
    total: { count: number }[];
  }[];

  const docs = result[0]?.items ?? [];
  const total = result[0]?.total?.[0]?.count ?? 0;

  /* hydrate professions + user names */
  const profIds = [...new Set(docs.flatMap((d) => (d.professions ?? []).map(String)))];
  const profs = profIds.length ? await Profession.find({ _id: { $in: profIds } }).select("name").lean() : [];
  const profMap = new Map(profs.map((p) => [String(p._id), p.name]));
  const userIds = docs.map((d) => d.userId as string);
  const users = userIds.length ? await (await import("@/models")).User.find({ _id: { $in: userIds } }).select("name image").lean() : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const items: SearchResultItem[] = docs.map((d) => {
    const u = userMap.get(d.userId as string);
    return {
      userId: d.userId as string,
      slug: d.slug,
      name: u?.name ?? d.displayName,
      image: (u?.image as string | null) ?? null,
      professionalTitle: d.professionalTitle ?? "",
      bio: (d.bio ?? "").slice(0, 160),
      city: d.location?.city ?? "",
      area: d.location?.area ?? "",
      professions: (d.professions ?? []).map((id) => profMap.get(String(id)) ?? ""),
      skills: (d.skills ?? []).slice(0, 6),
      experienceYears: d.experienceYears ?? 0,
      verificationStatus: d.verification?.status ?? "unverified",
      isAvailable: !!d.isAvailable,
      rating: {
        average: Math.round((d.rating?.average ?? 0) * 10) / 10,
        count: d.rating?.count ?? 0,
      },
      completedJobs: d.stats?.completedJobs ?? 0,
      minPrice: d.minPrice ?? null,
      pricingModels: [...new Set((d.topServices ?? []).map((s) => s.pricingModel))],
      topServices: (d.topServices ?? []).map((s) => ({
        id: String(s._id),
        title: s.title,
        pricingModel: s.pricingModel,
        price: s.price ?? null,
      })),
      distanceKm:
        d.distanceKm != null
          ? Math.round((d.distanceKm / 1000) * 10) / 10
          : params.city
            ? null
            : null,
    };
  });

  return { items, total, page, pages: Math.ceil(total / limit) };
}

/** Distinct cities that have providers (for filter dropdown) */
export async function citiesWithProviders(): Promise<string[]> {
  const rows = await ProviderProfile.aggregate([
    { $match: { isSuspended: false } },
    {
      $project: {
        cities: {
          $setUnion: [
            {
              $cond: {
                if: { $and: [{ $ne: ["$location.city", null] }, { $ne: ["$location.city", ""] }] },
                then: ["$location.city"],
                else: [],
              },
            },
            {
              $filter: {
                input: { $map: { input: { $ifNull: ["$serviceAreas", []] }, as: "a", in: "$$a.city" } },
                as: "city",
                cond: { $and: [{ $ne: ["$$city", null] }, { $ne: ["$$city", ""] }] },
              },
            },
          ],
        },
      },
    },
    { $unwind: "$cities" },
    { $group: { _id: "$cities" } },
    { $sort: { _id: 1 } },
  ]);
  const names = rows.map((r) => (typeof r._id === "string" ? r._id : "")).filter(Boolean);
  return uniqueSortedCities(names);
}

/** Featured providers for the homepage */
export interface FeaturedProvider {
  userId: string;
  slug: string;
  name: string;
  image: string | null;
  professionalTitle: string;
  city: string;
  rating: { average: number; count: number };
  verificationStatus: string;
  professions: string[];
  completedJobs: number;
  /* optional fields the search results carry but featured list does not */
  area?: string;
  isAvailable?: boolean;
  experienceYears?: number;
  distanceKm?: number;
}

export async function featuredProviders(limit = 6): Promise<FeaturedProvider[]> {
  const docs = await ProviderProfile.aggregate([
    { $match: { isSuspended: false, "verification.status": "verified" } },
    { $sort: { "rating.average": -1, "rating.count": -1 } },
    { $limit: limit },
  ]);
  if (docs.length < limit) {
    const exclude = docs.map((d) => String(d._id));
    const fill = await ProviderProfile.find({ isSuspended: false, _id: { $nin: exclude } })
      .sort({ "rating.count": -1 })
      .limit(limit - docs.length)
      .lean();
    docs.push(...fill);
  }
  const profIds = [...new Set(docs.flatMap((d) => (d.professions ?? []).map(String)))];
  const profs = profIds.length ? await Profession.find({ _id: { $in: profIds } }).select("name").lean() : [];
  const profMap = new Map(profs.map((p) => [String(p._id), p.name]));
  const { User } = await import("@/models");
  const users = await User.find({ _id: { $in: docs.map((d) => d.userId) } }).select("name image").lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return docs.map((d) => ({
    userId: d.userId as string,
    slug: d.slug,
    name: userMap.get(d.userId as string)?.name ?? d.displayName,
    image: (userMap.get(d.userId as string)?.image as string | null) ?? null,
    professionalTitle: d.professionalTitle ?? "",
    city: d.location?.city ?? "",
    rating: {
      average: Math.round((d.rating?.average ?? 0) * 10) / 10,
      count: d.rating?.count ?? 0,
    },
    verificationStatus: d.verification?.status ?? "unverified",
    professions: (d.professions ?? []).map((id) => profMap.get(String(id)) ?? ""),
    completedJobs: d.stats?.completedJobs ?? 0,
  }));
}

export interface ServiceSearchItem {
  id: string;
  title: string;
  description: string;
  images: { url: string; publicId: string | null }[];
  pricingModel: "fixed" | "hourly" | "starting" | "custom";
  price: number | null;
  durationHours: number | null;
  professionName: string;
  providerName: string;
  providerSlug: string;
  providerUserId: string;
  city: string;
  verificationStatus: string;
  stats: { views: number; bookings: number };
}

/** Paginated listing of active services offered by non-suspended providers */
export async function searchServices(params: SearchParams): Promise<{
  items: ServiceSearchItem[];
  total: number;
  page: number;
  pages: number;
}> {
  const page = params.page ?? 1;

  /* resolve taxonomy slugs -> ids */
  let professionIds: string[] = [];
  if (params.profession) {
    const prof = await Profession.findOne({ slug: params.profession, isActive: true }).lean();
    if (prof) professionIds = [String(prof._id)];
  } else if (params.category) {
    const cat = await Category.findOne({ slug: params.category, isActive: true }).lean();
    if (cat) {
      const profs = await Profession.find({ categoryId: String(cat._id), isActive: true }).select("_id").lean();
      professionIds = profs.map((p) => String(p._id));
    }
  }

  const match: Record<string, unknown> = { isActive: true };
  if (professionIds.length) match.professionId = { $in: professionIds };
  if (params.pricingModel) match.pricingModel = params.pricingModel;
  if (params.maxPrice) {
    match.price = { $ne: null, $lte: params.maxPrice };
    match.pricingModel = match.pricingModel ?? { $in: ["fixed", "hourly", "starting"] };
  }
  if (params.q) match.$text = { $search: params.q, $caseSensitive: false };

  const providerMatch: Record<string, unknown> = { isSuspended: false };
  if (params.verified) providerMatch["verification.status"] = "verified";
  if (params.city) {
    const cityRegex = new RegExp(`^${escapeRegExp(params.city)}$`, "i");
    providerMatch.$or = [{ "location.city": cityRegex }, { "serviceAreas.city": cityRegex }];
  }

  const pipeline: Record<string, unknown>[] = [
    { $match: match },
    {
      $lookup: {
        from: "providerprofiles",
        let: { pid: "$providerProfileId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$pid"] }, ...providerMatch } },
          { $project: { userId: 1, slug: 1, displayName: 1, "location.city": 1, "verification.status": 1 } },
        ],
        as: "provider",
      },
    },
    { $unwind: "$provider" },
    { $sort: { "stats.bookings": -1, createdAt: -1 } },
    {
      $facet: {
        data: [{ $skip: (page - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE }],
        total: [{ $count: "n" }],
      },
    },
  ];

  const [agg] = (await Service.aggregate(pipeline as never)) as unknown as {
    data?: Record<string, unknown>[];
    total?: { n: number }[];
  }[];
  const rows: Record<string, unknown>[] = agg?.data ?? [];
  const total: number = agg?.total?.[0]?.n ?? 0;

  const profIds = [...new Set(rows.map((r) => String(r.professionId)))];
  const profs = profIds.length ? await Profession.find({ _id: { $in: profIds } }).select("name").lean() : [];
  const profMap = new Map(profs.map((p) => [String(p._id), p.name]));
  const { User } = await import("@/models");
  const users = await User.find({ _id: { $in: rows.map((r) => String((r.provider as Record<string, unknown>)?.userId)) } })
    .select("name")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u.name]));

  return {
    items: rows.map((r) => {
      const provider = r.provider as {
        userId: string;
        slug: string;
        displayName?: string;
        location?: { city?: string };
        verification?: { status?: string };
      };
      const stats = (r.stats ?? {}) as { views?: number; bookings?: number };
      return {
        id: String(r._id),
        title: r.title as string,
        description: r.description as string,
        images: (r.images ?? []) as { url: string; publicId: string | null }[],
        pricingModel: r.pricingModel as "fixed" | "hourly" | "starting" | "custom",
        price: (r.price ?? null) as number | null,
        durationHours: (r.durationHours ?? null) as number | null,
        professionName: profMap.get(String(r.professionId)) ?? "",
        providerName: userMap.get(provider.userId as string) ?? provider.displayName ?? "",
        providerSlug: provider.slug,
        providerUserId: provider.userId as string,
        city: provider.location?.city ?? "",
        verificationStatus: provider.verification?.status ?? "unverified",
        stats: { views: stats.views ?? 0, bookings: stats.bookings ?? 0 },
      };
    }),
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  };
}

export function centerForCity(city?: string) {
  return city ? cityCenter(city) : null;
}
