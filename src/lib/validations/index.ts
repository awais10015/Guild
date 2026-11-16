import { z } from "zod";
import {
  PRICING_MODELS,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  BOOKING_STATUSES,
  TIME_SLOTS,
} from "@/lib/constants";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/** International mobile, stored in E.164 (+ followed by 7–14 digits) */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => {
    const digits = v.replace(/[\s()-]/g, "");
    return digits.startsWith("+") ? digits : `+${digits}`;
  })
  .refine((v) => /^\+[1-9]\d{6,14}$/.test(v), "Enter a valid phone number in international format, e.g. +14155552671");

export const latLngSchema = z.object({
  lat: z.number().min(-60).max(80),
  lng: z.number().min(-180).max(180),
});

/* ---------------- auth ---------------- */

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/* ---------------- onboarding / account ---------------- */

export const onboardingSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("customer"),
    phone: phoneSchema,
    city: z.string().trim().min(2).max(60),
    area: z.string().trim().max(80).optional().or(z.literal("")),
  }),
  z.object({
    role: z.literal("provider"),
    phone: phoneSchema,
    professionalTitle: z.string().trim().min(4).max(80),
    professions: z.array(objectIdSchema).min(1, "Pick at least one profession").max(5),
    city: z.string().trim().min(2).max(60),
    area: z.string().trim().max(80).optional().or(z.literal("")),
    coordinates: latLngSchema.optional(),
    bio: z.string().trim().max(2000).optional().or(z.literal("")),
  }),
]);

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phoneSchema.optional(),
  address: z
    .object({
      label: z.string().trim().max(60).optional().or(z.literal("")),
      city: z.string().trim().min(2).max(60),
      area: z.string().trim().max(80).optional().or(z.literal("")),
      streetAddress: z.string().trim().max(200).optional().or(z.literal("")),
    })
    .optional(),
});

/* ---------------- provider profile ---------------- */

const workingHoursSchema = z
  .partialRecord(
    z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    z.array(z.object({ start: z.string(), end: z.string() })).max(2),
  )
  .optional();

export const serviceAreaSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  lat: z.number(),
  lng: z.number(),
  radiusKm: z.number().min(1).max(50),
});

export const providerProfileSchema = z.object({
  professionalTitle: z.string().trim().min(4).max(80),
  bio: z.string().trim().min(20).max(2000),
  professions: z.array(objectIdSchema).min(1).max(5),
  skills: z.array(z.string().trim().min(1).max(30)).max(20),
  experienceYears: z.number().int().min(0).max(60),
  experienceSummary: z.string().trim().max(2000).optional().or(z.literal("")),
  languages: z.array(z.string().trim().min(1).max(20)).max(8),
  phone: phoneSchema,
  whatsapp: phoneSchema.optional().or(z.literal("")),
  location: z.object({
    country: z.string().trim().min(2).max(60),
    city: z.string().trim().min(2).max(60),
    area: z.string().trim().max(80).optional().or(z.literal("")),
    lat: z.number(),
    lng: z.number(),
  }),
  serviceAreas: z.array(serviceAreaSchema).min(1, "Add at least one service area").max(10),
  workingHours: workingHoursSchema,
  isAvailable: z.boolean(),
});

/* ---------------- services ---------------- */

export const serviceSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(30).max(5000),
  professionId: objectIdSchema,
  pricingModel: z.enum(PRICING_MODELS),
  price: z.number().int().min(1).max(50_000_000).nullable().optional(),
  durationHours: z.number().min(0.5).max(24).optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string().max(600),
        publicId: z.string().max(200).optional().nullable(),
      }),
    )
    .max(8),
  isActive: z.boolean().default(true),
});

/* ---------------- bookings ---------------- */

export const bookingCreateSchema = z.object({
  serviceId: objectIdSchema,
  description: z.string().trim().min(20, "Describe the work (min 20 chars)").max(2000),
  attachments: z
    .array(z.object({ url: z.string().max(600), publicId: z.string().max(200).optional().nullable() }))
    .max(5),
  address: z.object({
    contactName: z.string().trim().min(2).max(80),
    contactPhone: phoneSchema,
    city: z.string().trim().min(2).max(60),
    area: z.string().trim().max(80).optional().or(z.literal("")),
    streetAddress: z.string().trim().min(5).max(200),
  }),
  scheduledDate: z.coerce.date(),
  scheduledTime: z.enum(TIME_SLOTS),
});

export const bookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(500).optional(),
});

/* ---------------- quotations ---------------- */

export const quotationCreateSchema = z.object({
  bookingId: objectIdSchema,
  items: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(120),
        amount: z.number().int().min(1).max(50_000_000),
      }),
    )
    .min(1)
    .max(15),
  laborHours: z.number().min(0.5).max(500).optional().nullable(),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  validDays: z.number().int().min(1).max(30).default(7),
});

export const quotationRespondSchema = z.object({
  action: z.enum(["accepted", "declined"]),
});

/* ---------------- reviews ---------------- */

export const reviewSchema = z.object({
  bookingId: objectIdSchema,
  overall: z.number().int().min(1).max(5),
  quality: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(2000),
  images: z
    .array(z.object({ url: z.string().max(600), publicId: z.string().max(200).optional().nullable() }))
    .max(4),
});

export const reviewReplySchema = z.object({
  body: z.string().trim().min(5).max(1000),
});

/* ---------------- misc ---------------- */

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().min(6).max(64),
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().min(10).max(2000),
});

export const verificationSchema = z.object({
  documents: z
    .array(
      z.object({
        type: z.enum(["id_document", "license", "certificate", "business_proof"]),
        label: z.string().trim().min(2).max(80),
        url: z.string().max(600),
        publicId: z.string().max(200).optional().nullable(),
      }),
    )
    .min(1, "Upload at least one document")
    .max(6),
});

export const favoriteSchema = z.object({
  providerId: objectIdSchema,
});

export const markReadSchema = z.object({
  ids: z.array(objectIdSchema).optional(),
  all: z.boolean().optional(),
});

/* ---------------- messaging ---------------- */

export const sendMessageSchema = z.object({
  type: z.enum(["text", "image"]),
  body: z.string().max(4000).optional().or(z.literal("")),
  attachment: z
    .object({
      url: z.string().max(600),
      publicId: z.string().max(200).optional().nullable(),
    })
    .nullable()
    .optional(),
});

export const typingSchema = z.object({
  isTyping: z.boolean(),
});

/* ---------------- search ---------------- */

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  area: z.string().trim().max(80).optional(),
  profession: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  verified: z.coerce.boolean().optional(),
  available: z.coerce.boolean().optional(),
  pricingModel: z.enum(PRICING_MODELS).optional(),
  maxPrice: z.coerce.number().int().min(1).optional(),
  minExperience: z.coerce.number().int().min(0).max(60).optional(),
  sort: z
    .enum(["relevance", "rating", "nearest", "price_low", "experience", "reviews"])
    .default("rating"),
  page: z.coerce.number().int().min(1).default(1),
  radiusKm: z.coerce.number().min(1).max(100).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

/* ---------------- admin taxonomy ---------------- */

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().min(2).max(40),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  order: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const professionSchema = z.object({
  categoryId: objectIdSchema,
  name: z.string().trim().min(2).max(60),
  keywords: z.array(z.string().trim().min(1).max(40)).max(10),
  isActive: z.boolean().default(true),
});
