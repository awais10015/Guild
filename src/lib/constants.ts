/* Guild — shared constants, enums and state machines (server + client safe) */

import { WORLD_COUNTRIES } from "@/lib/world-countries";

export const APP_NAME = "Guild";
export const APP_TAGLINE = "Skilled professionals, on demand — worldwide";
export const CURRENCY = "USD";

/* ---------------- pricing ---------------- */

export const PRICING_MODELS = ["fixed", "hourly", "starting", "custom"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  fixed: "Fixed price",
  hourly: "Per hour",
  starting: "Starting from",
  custom: "Custom quotation",
};

export function priceLabel(model: PricingModel, price?: number | null): string {
  switch (model) {
    case "fixed":
      return `$${Number(price ?? 0).toLocaleString("en-US")}`;
    case "hourly":
      return `$${Number(price ?? 0).toLocaleString("en-US")}/hr`;
    case "starting":
      return `From $${Number(price ?? 0).toLocaleString("en-US")}`;
    case "custom":
      return "Quotation based";
  }
}

/* ---------------- bookings ---------------- */

export const BOOKING_STATUSES = [
  "pending",
  "accepted",
  "quotation_sent",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
  "disputed",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "accepted",
  "quotation_sent",
  "confirmed",
  "in_progress",
];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  quotation_sent: "Quotation sent",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  disputed: "Disputed",
};

/** tailwind classes per status */
export const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  quotation_sent: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  confirmed: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  disputed: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

export type ActorRole = "customer" | "provider" | "admin";

/**
 * Server-authoritative booking state machine.
 * transitions[from][to] = which actor roles may perform it.
 */
export const BOOKING_TRANSITIONS: Record<
  BookingStatus,
  Partial<Record<BookingStatus, ActorRole[]>>
> = {
  pending: {
    accepted: ["provider"],
    rejected: ["provider"],
    cancelled: ["customer", "provider"],
  },
  accepted: {
    quotation_sent: ["provider"],
    confirmed: ["provider"],
    cancelled: ["customer", "provider"],
  },
  quotation_sent: {
    confirmed: ["customer"],
    cancelled: ["customer", "provider"],
  },
  confirmed: {
    in_progress: ["provider"],
    cancelled: ["customer", "provider"],
  },
  in_progress: {
    completed: ["provider"],
    disputed: ["customer", "provider"],
  },
  completed: {
    disputed: ["customer"],
  },
  disputed: {
    completed: ["admin"],
    cancelled: ["admin"],
  },
  rejected: {},
  cancelled: {},
};

/* ---------------- taxonomy / location ---------------- */

export interface CityInfo {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

/** Curated cities for selectors (country → city). Expand here as needed. */
export const GLOBAL_CITIES: CityInfo[] = [
  /* Pakistan */
  { name: "Karachi", country: "Pakistan", lat: 24.8607, lng: 67.0011 },
  { name: "Lahore", country: "Pakistan", lat: 31.5204, lng: 74.3587 },
  { name: "Islamabad", country: "Pakistan", lat: 33.6844, lng: 73.0479 },
  { name: "Rawalpindi", country: "Pakistan", lat: 33.5651, lng: 73.0169 },
  { name: "Faisalabad", country: "Pakistan", lat: 31.4504, lng: 73.135 },
  { name: "Multan", country: "Pakistan", lat: 30.1575, lng: 71.5249 },
  { name: "Peshawar", country: "Pakistan", lat: 34.0151, lng: 71.5249 },
  { name: "Quetta", country: "Pakistan", lat: 30.1798, lng: 66.975 },
  /* United Arab Emirates */
  { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { name: "Abu Dhabi", country: "United Arab Emirates", lat: 24.4539, lng: 54.3773 },
  { name: "Sharjah", country: "United Arab Emirates", lat: 25.3463, lng: 55.4209 },
  /* Saudi Arabia */
  { name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753 },
  { name: "Jeddah", country: "Saudi Arabia", lat: 21.4858, lng: 39.1925 },
  /* United Kingdom */
  { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  { name: "Manchester", country: "United Kingdom", lat: 53.4808, lng: -2.2426 },
  { name: "Birmingham", country: "United Kingdom", lat: 52.4862, lng: -1.8904 },
  { name: "Edinburgh", country: "United Kingdom", lat: 55.9533, lng: -3.1883 },
  /* United States */
  { name: "New York", country: "United States", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298 },
  { name: "Houston", country: "United States", lat: 29.7604, lng: -95.3698 },
  { name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194 },
  { name: "Miami", country: "United States", lat: 25.7617, lng: -80.1918 },
  { name: "Seattle", country: "United States", lat: 47.6062, lng: -122.3321 },
  { name: "Dallas", country: "United States", lat: 32.7767, lng: -96.797 },
  /* Canada */
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
  { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207 },
  { name: "Montreal", country: "Canada", lat: 45.5017, lng: -73.5673 },
  /* Germany */
  { name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { name: "Munich", country: "Germany", lat: 48.1351, lng: 11.582 },
  { name: "Frankfurt", country: "Germany", lat: 50.1109, lng: 8.6821 },
  /* India */
  { name: "Mumbai", country: "India", lat: 19.076, lng: 72.8777 },
  { name: "Delhi", country: "India", lat: 28.6139, lng: 77.209 },
  { name: "Bangalore", country: "India", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", country: "India", lat: 17.385, lng: 78.4867 },
  /* Australia */
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631 },
  { name: "Brisbane", country: "Australia", lat: -27.4698, lng: 153.0251 },
  /* Singapore */
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  /* Kenya */
  { name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219 },
  /* Mexico */
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332 },
  /* France */
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  /* Spain */
  { name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038 },
  { name: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734 },
  /* South Africa */
  { name: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473 },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241 },
  /* Turkey */
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784 },
  { name: "Ankara", country: "Turkey", lat: 39.9334, lng: 32.8597 },
  /* Bangladesh */
  { name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.4125 },
  /* Egypt */
  { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357 },
];

export const CUSTOM_CITY_SELECT_VALUE = "__custom_city__";

/** All countries in the location dropdown (cities remain curated per country). */
export const GLOBAL_COUNTRIES: string[] = [...WORLD_COUNTRIES];

export function citiesForCountry(country: string): CityInfo[] {
  return GLOBAL_CITIES.filter((c) => c.country === country).sort((a, b) => a.name.localeCompare(b.name));
}

export function findCityInfo(city: string, country?: string): CityInfo | undefined {
  const norm = city.trim().toLowerCase();
  const pool = country ? citiesForCountry(country) : GLOBAL_CITIES;
  return pool.find((c) => c.name.toLowerCase() === norm);
}

export function countryForCity(city: string): string | undefined {
  return findCityInfo(city)?.country;
}

export function defaultCountryForCity(city: string, fallback = GLOBAL_COUNTRIES[0] ?? ""): string {
  return countryForCity(city) ?? fallback;
}

export const TIME_SLOTS = [
  "08:00 – 11:00",
  "11:00 – 14:00",
  "14:00 – 17:00",
  "17:00 – 20:00",
  "Flexible / anytime",
] as const;

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Arabic",
  "Hindi",
  "Urdu",
  "Mandarin",
  "Bengali",
] as const;

/* ---------------- notifications ---------------- */

export const NOTIFICATION_TYPES = [
  "booking_requested",
  "booking_accepted",
  "booking_rejected",
  "quotation_received",
  "quotation_accepted",
  "booking_status",
  "message_received",
  "review_received",
  "verification_update",
  "announcement",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/* ---------------- misc ---------------- */

export const PAGE_SIZE = 12;
export const MAX_PORTFOLIO_IMAGES = 20;
export const MAX_SERVICE_IMAGES = 8;
export const MAX_BOOKING_IMAGES = 5;
export const MAX_SERVICE_LISTINGS = 20;

/** Max upload size accepted by the client before requesting a signature. */
export const UPLOAD_MAX_BYTES = 8_000_000;

export const REPORT_REASONS = [
  "spam",
  "scam",
  "inappropriate",
  "fake_profile",
  "poor_quality",
  "pricing_issue",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGET_TYPES = ["user", "provider", "service", "booking", "review", "message"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as readonly string[]).includes(v);
}
