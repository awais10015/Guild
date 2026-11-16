/* Guild — shared constants, enums and state machines (server + client safe) */

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

/** Global launch cities — a representative spread across continents */
export const GLOBAL_CITIES: CityInfo[] = [
  { name: "New York", country: "United States", lat: 40.7128, lng: -74.006 },
  { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
  { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { name: "Mumbai", country: "India", lat: 19.076, lng: 72.8777 },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219 },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332 },
];

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
