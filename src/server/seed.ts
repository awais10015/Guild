/**
 * Guild database seed — idempotent, runs automatically on first boot
 * (AUTO_SEED=true) or manually via `npm run db:seed`.
 *
 * Creates: admin, taxonomy (13 categories / 15 professions), 2 demo customers,
 * 8 providers with full profiles across global cities, services, fixed
 * BK-SEED-DEMO-* bookings (multiple statuses), quotations, reviews,
 * multi-thread demo chats, notifications, a pending verification request and
 * demo favorites. Sample data is idempotent and safe beside real bookings.
 */
import mongoose from "mongoose";
import { hashPassword } from "better-auth/crypto";
import { connectDB } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import {
  User,
  Category,
  Profession,
  ProviderProfile,
  Service,
  Booking,
  Quotation,
  Review,
  Conversation,
  Message,
  Favorite,
  Notification,
  VerificationRequest,
  isOpenStatus,
} from "@/models";
import { recalcProviderRating } from "@/server/services/review-service";
import { findOrCreateConversation } from "@/server/services/conversation-service";
import { toGeoJSONPoint } from "@/lib/geo";
import { slugify } from "@/lib/text";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@1234";

const TAXONOMY: { name: string; icon: string; description: string; professions: { name: string; keywords: string[] }[] }[] = [
  { name: "Electrical", icon: "zap", description: "Wiring, fittings, repairs and installations", professions: [{ name: "Electrician", keywords: ["wiring", "electric", "outlet"] }] },
  { name: "Plumbing", icon: "wrench", description: "Leaks, fittings, water heaters and sanitary", professions: [{ name: "Plumber", keywords: ["pipe", "leak", "faucet"] }] },
  { name: "AC & Appliances", icon: "air-vent", description: "AC service, fridge and appliance repair", professions: [{ name: "AC Technician", keywords: ["ac", "cooling", "air conditioning"] }, { name: "Appliance Repair Technician", keywords: ["fridge", "washing machine", "appliance"] }] },
  { name: "Carpentry & Furniture", icon: "hammer", description: "Custom furniture, doors and fittings", professions: [{ name: "Carpenter", keywords: ["wood", "furniture", "carpentry"] }] },
  { name: "Painting & Decoration", icon: "paintbrush", description: "Interior and exterior painting, texture work", professions: [{ name: "Painter", keywords: ["paint", "wall", "decorating"] }] },
  { name: "Construction & Renovation", icon: "building-2", description: "Contractors, masonry and full renovations", professions: [{ name: "Construction Contractor", keywords: ["renovation", "construction"] }, { name: "Mason", keywords: ["brick", "plaster"] }] },
  { name: "Cleaning & Pest Control", icon: "sparkles", description: "Deep cleaning, fumigation and sanitization", professions: [{ name: "Cleaner", keywords: ["cleaning", "mop", "housekeeping"] }] },
  { name: "Design & Architecture", icon: "ruler", description: "Home design, interior and 3D plans", professions: [{ name: "Architect", keywords: ["design", "plan", "architecture"] }, { name: "Interior Designer", keywords: ["interior", "decor"] }] },
  { name: "Automotive", icon: "car", description: "Mechanics, denting painting and diagnostics", professions: [{ name: "Mechanic", keywords: ["car", "engine", "repair"] }] },
  { name: "Events & Photography", icon: "camera", description: "Weddings, products and professional shoots", professions: [{ name: "Photographer", keywords: ["photo", "wedding", "camera"] }] },
  { name: "Tutoring & Lessons", icon: "graduation-cap", description: "Home tutors and skill teachers", professions: [{ name: "Tutor", keywords: ["tuition", "teacher", "lessons"] }] },
  { name: "Beauty & Wellness", icon: "scissors", description: "Salon at home, grooming and beauty", professions: [{ name: "Beautician", keywords: ["salon", "makeup", "grooming"] }] },
  {
    name: "Other",
    icon: "package-open",
    description: "Trades and services that do not fit the main categories",
    professions: [],
  },
];

const IMG = (n: number, w = 800, h = 600) => `/images/demo/img-${n}.svg`;

interface ProviderSeed {
  name: string;
  email: string;
  phone: string;
  title: string;
  professions: string[]; // profession names
  city: string;
  country: string;
  area: string;
  lat: number;
  lng: number;
  serviceAreas: { name: string; radiusKm: number }[];
  experienceYears: number;
  bio: string;
  skills: string[];
  languages: string[];
  verified: boolean;
  images: number[];
  services: { title: string; description: string; profession: string; model: "fixed" | "hourly" | "starting" | "custom"; price: number | null; durationHours: number | null; image: number }[];
}

const PROVIDERS: ProviderSeed[] = [
  {
    name: "Marcus Reed Electrical", email: "marcus.reed@guild.app", phone: "+12125550141",
    title: "Licensed Electrician · 12 years experience",
    professions: ["Electrician"], city: "New York", country: "United States", area: "Hell's Kitchen",
    lat: 40.7623, lng: -73.9934,
    serviceAreas: [{ name: "Midtown Manhattan", radiusKm: 12 }, { name: "Williamsburg", radiusKm: 14 }, { name: "Long Island City", radiusKm: 15 }],
    experienceYears: 12,
    bio: "I handle complete house rewiring, breaker panel upgrades, EV charger installation and emergency fault-finding. All work is done to NEC code with a 6-month workmanship warranty. My van is stocked so most jobs finish in a single visit.",
    skills: ["House rewiring", "Breaker panels", "EV chargers", "Fault finding", "Light fittings"],
    languages: ["English", "Spanish"], verified: true,
    images: [1, 2],
    services: [
      { title: "Complete home rewiring survey & repair", description: "Full inspection of your home wiring, repair of faulty circuits, tripping breakers and loose connections. Includes thermal check of the main panel and a written safety report. Materials charged at market rate with receipt.", profession: "Electrician", model: "starting", price: 380, durationHours: 3, image: 1 },
      { title: "EV charger & breaker panel installation", description: "Installation and configuration of home EV chargers or panel upgrades, including load balancing across essential circuits, permit-ready documentation and testing.", profession: "Electrician", model: "fixed", price: 640, durationHours: 4, image: 2 },
    ],
  },
  {
    name: "Farhan AC & Electrical Works", email: "farhan.cooling@guild.app", phone: "+971505550152",
    title: "Electrician & AC Technician · 7 years",
    professions: ["Electrician", "AC Technician"], city: "Dubai", country: "United Arab Emirates", area: "Al Barsha 1",
    lat: 25.1065, lng: 55.2008,
    serviceAreas: [{ name: "Al Barsha", radiusKm: 12 }, { name: "Dubai Marina", radiusKm: 10 }, { name: "Business Bay", radiusKm: 12 }],
    experienceYears: 7,
    bio: "Split AC installation, servicing and gas refilling alongside general electrical work. Summer emergency slots available. I bring my own gauges, vacuum pump and ladder.",
    skills: ["Split AC install", "Gas refilling", "AC service", "Voltage stabilizers"],
    languages: ["English", "Arabic", "Hindi"], verified: false,
    images: [3, 4],
    services: [
      { title: "Split AC installation (up to 2 ton)", description: "Complete split AC installation: bracket fitting, copper piping up to 10 feet, drainage setup, vacuum and gas charging. Extra piping billed per foot.", profession: "AC Technician", model: "fixed", price: 180, durationHours: 2.5, image: 3 },
      { title: "AC general service (foam wash)", description: "Deep foam wash of indoor and outdoor units, filter cleaning, drain flush and cooling performance check. Recommended before every summer.", profession: "AC Technician", model: "fixed", price: 85, durationHours: 1.5, image: 4 },
      { title: "Emergency electrical fault repair", description: "Hourly rate for urgent faults: tripping, short circuits, burnt sockets. Includes diagnosis and minor parts; major parts quoted on site.", profession: "Electrician", model: "hourly", price: 45, durationHours: 2, image: 3 },
    ],
  },
  {
    name: "SparkleHome Cleaning Co.", email: "sparklehome@guild.app", phone: "+447700550153",
    title: "Deep Cleaning Specialist · trained team of 4",
    professions: ["Cleaner"], city: "London", country: "United Kingdom", area: "Shoreditch",
    lat: 51.5257, lng: -0.0816,
    serviceAreas: [{ name: "Shoreditch", radiusKm: 10 }, { name: "Islington", radiusKm: 8 }, { name: "Canary Wharf", radiusKm: 12 }],
    experienceYears: 5,
    bio: "Female-led professional cleaning team. Deep kitchen degreasing, bathroom descaling, sofa and carpet shampooing with industrial machines. All staff are background-checked and uniformed. Bring your own supplies or we can.",
    skills: ["Deep cleaning", "Sofa shampoo", "Kitchen degrease", "Fumigation support"],
    languages: ["English", "Polish"], verified: true,
    images: [5, 6],
    services: [
      { title: "Full house deep cleaning (up to 2,000 sq ft)", description: "Top-to-bottom deep clean: kitchen degreasing, bathroom descaling, floor scrubbing, window glass, fans and fixtures. Team of 4, typically 6-8 hours.", profession: "Cleaner", model: "fixed", price: 280, durationHours: 8, image: 5 },
      { title: "Sofa & carpet shampooing", description: "Machine shampooing of sofas, mattresses and carpets with stain treatment. Price is per 3-piece suite; rugs and carpets quoted by size.", profession: "Cleaner", model: "starting", price: 120, durationHours: 3, image: 6 },
    ],
  },
  {
    name: "Dave Lane Plumbing", email: "dave.lane@guild.app", phone: "+14165550154",
    title: "Master Plumber · 15 years, licensed",
    professions: ["Plumber"], city: "Toronto", country: "Canada", area: "Danforth Village",
    lat: 43.6892, lng: -79.3369,
    serviceAreas: [{ name: "East York", radiusKm: 10 }, { name: "Riverdale", radiusKm: 8 }, { name: "Scarborough North", radiusKm: 14 }],
    experienceYears: 15,
    bio: "From dripping taps to complete bathroom re-piping. I specialize in hidden leak detection without breaking tiles, water heater installations and pressure problems. Permanent fix, not patchwork.",
    skills: ["Leak detection", "Re-piping", "Water heaters", "Fixtures"],
    languages: ["English"], verified: true,
    images: [7, 8],
    services: [
      { title: "Hidden leak detection & repair", description: "Non-destructive leak tracing using pressure testing and moisture meters, followed by targeted repair. Includes post-fix pressure test.", profession: "Plumber", model: "starting", price: 240, durationHours: 3, image: 7 },
      { title: "Water heater & pressure pump installation", description: "Installation of tankless or tank water heaters and pressure pumps with dry-run protection, piping integration and testing.", profession: "Plumber", model: "fixed", price: 310, durationHours: 3, image: 8 },
    ],
  },
  {
    name: "Oakline Carpentry", email: "oakline@guild.app", phone: "+49305550155",
    title: "Furniture Carpenter · custom woodwork",
    professions: ["Carpenter"], city: "Berlin", country: "Germany", area: "Kreuzberg",
    lat: 52.4996, lng: 13.4203,
    serviceAreas: [{ name: "Kreuzberg", radiusKm: 12 }, { name: "Friedrichshain", radiusKm: 10 }, { name: "Neukölln", radiusKm: 10 }],
    experienceYears: 8,
    bio: "Custom wardrobes, kitchen cabinets, beds and office furniture in oak, MDF and laminate. Design input included — I draft the layout with you before cutting a single board.",
    skills: ["Wardrobes", "Kitchen cabinets", "Custom beds", "Finishing"],
    languages: ["German", "English"], verified: true,
    images: [9, 10],
    services: [
      { title: "Custom wardrobe (per running metre)", description: "Made-to-measure wardrobe with laminate finish, soft-close hinges and internal drawers. Price per running metre of length, 2.2m height, oak or MDF.", profession: "Carpenter", model: "starting", price: 95, durationHours: null, image: 9 },
      { title: "Door repair & refit", description: "Sagging doors, hinge replacement, lock refitting and seasonal swelling fixes for wooden doors.", profession: "Carpenter", model: "hourly", price: 35, durationHours: 2, image: 10 },
    ],
  },
  {
    name: "ArcticPro HVAC", email: "arcticpro@guild.app", phone: "+6565550156",
    title: "HVAC & AC Specialist · 10 years",
    professions: ["AC Technician", "Appliance Repair Technician"], city: "Singapore", country: "Singapore", area: "Orchard Road",
    lat: 1.3048, lng: 103.8318,
    serviceAreas: [{ name: "Orchard", radiusKm: 10 }, { name: "Bukit Timah", radiusKm: 12 }, { name: "Jurong East", radiusKm: 14 }],
    experienceYears: 10,
    bio: "Certified HVAC technician serving central Singapore. Inverter AC diagnostics, PCB repair, fridge cooling issues and annual maintenance contracts for offices.",
    skills: ["Inverter AC repair", "PCB diagnostics", "Fridge repair", "Maintenance contracts"],
    languages: ["English", "Mandarin"], verified: true,
    images: [11, 12],
    services: [
      { title: "Inverter AC fault diagnosis & PCB repair", description: "Complete electronic diagnosis of inverter ACs: error codes, sensor faults, PCB component-level repair where possible. Includes cooling test.", profession: "AC Technician", model: "starting", price: 110, durationHours: 2, image: 11 },
      { title: "Refrigerator cooling repair", description: "Thermostat, compressor relay and gas issues diagnosed and fixed for all major fridge brands.", profession: "Appliance Repair Technician", model: "custom", price: null, durationHours: null, image: 12 },
    ],
  },
  {
    name: "Lumina Pixel Studio", email: "lumina.studio@guild.app", phone: "+61295550157",
    title: "Wedding & Product Photographer",
    professions: ["Photographer"], city: "Sydney", country: "Australia", area: "Surry Hills",
    lat: -33.8861, lng: 151.2087,
    serviceAreas: [{ name: "Sydney city-wide", radiusKm: 25 }],
    experienceYears: 6,
    bio: "Candid wedding coverage, engagement events and product photography with same-week delivery. Two-camera setup, drone available. 200+ edited photos per event.",
    skills: ["Wedding coverage", "Product shoots", "Drone", "Editing"],
    languages: ["English"], verified: false,
    images: [13, 14],
    services: [
      { title: "Wedding event coverage (full day)", description: "Full-day candid + traditional coverage by a two-person team. Includes 200+ edited photos and a 60-second highlight reel.", profession: "Photographer", model: "starting", price: 1200, durationHours: 10, image: 13 },
      { title: "Product photography (per 10 products)", description: "Studio product shots on white or lifestyle backgrounds, 10 products per session, 3 edited angles each.", profession: "Photographer", model: "fixed", price: 450, durationHours: 4, image: 14 },
    ],
  },
  {
    name: "Cornerstone Renovations", email: "cornerstone.works@guild.app", phone: "+91985550158",
    title: "Licensed Construction Contractor · 20 years",
    professions: ["Construction Contractor", "Painter", "Plumber"], city: "Mumbai", country: "India", area: "Bandra West",
    lat: 19.0596, lng: 72.8295,
    serviceAreas: [{ name: "Bandra West", radiusKm: 10 }, { name: "Andheri West", radiusKm: 14 }, { name: "Juhu", radiusKm: 8 }],
    experienceYears: 20,
    bio: "Turn-key home construction, room renovations and exterior makeovers. Registered firm with labour insurance. Free site visit with a written BoQ within 48 hours.",
    skills: ["Renovation", "Painting", "Waterproofing", "Project management"],
    languages: ["English", "Hindi"], verified: true,
    images: [15, 16],
    services: [
      { title: "Room renovation package", description: "Complete room makeover: strip-out and disposal, plaster, paint, ceiling and flooring coordination. Fixed after free site survey.", profession: "Construction Contractor", model: "custom", price: null, durationHours: null, image: 15 },
      { title: "Exterior weather-coat painting (per sq m)", description: "Pressure wash, crack filling and two coats of weather-proof exterior paint. Price per square metre of covered wall area.", profession: "Painter", model: "starting", price: 22, durationHours: null, image: 16 },
    ],
  },
];

const CUSTOMERS = [
  { name: "Emily Carter", email: "emily@demo.guild.app", phone: "+12125550171", city: "New York", area: "Brooklyn Heights", street: "45 Pineapple Street, Apt 6B, Brooklyn Heights" },
  { name: "James Whitfield", email: "james@demo.guild.app", phone: "+447700550172", city: "London", area: "Islington", street: "12 Highbury Hill, Flat 2, Islington" },
];

const DEMO_BOOKING_NUMBERS = [
  "BK-SEED-DEMO-COMPLETED-ELECTRIC",
  "BK-SEED-DEMO-COMPLETED-CLEAN",
  "BK-SEED-DEMO-COMPLETED-PLUMB",
  "BK-SEED-DEMO-COMPLETED-CARP",
  "BK-SEED-DEMO-QUOTATION-RENO",
  "BK-SEED-DEMO-PENDING-HVAC",
  "BK-SEED-DEMO-CONFIRMED-AC",
] as const;

type DemoHistoryStep = { status: string; by: "customer" | "provider"; note?: string };

interface DemoBookingDef {
  bookingNumber: (typeof DEMO_BOOKING_NUMBERS)[number];
  customerIndex: number;
  providerIndex: number;
  serviceIndex: number;
  status: string;
  scheduledOffsetDays: number;
  amount: number | null;
  historyExtra: DemoHistoryStep[];
  review?: { overall: number; q: number; p: number; c: number; comment: string };
}

const DEMO_BOOKINGS: DemoBookingDef[] = [
  {
    bookingNumber: "BK-SEED-DEMO-COMPLETED-ELECTRIC",
    customerIndex: 0,
    providerIndex: 0,
    serviceIndex: 0,
    status: "completed",
    scheduledOffsetDays: -4,
    amount: 420,
    historyExtra: [
      { status: "accepted", by: "provider" },
      { status: "confirmed", by: "provider", note: "Starting price plus parts, confirmed on site" },
      { status: "in_progress", by: "provider" },
      { status: "completed", by: "provider", note: "All circuits fixed" },
    ],
    review: {
      overall: 5,
      q: 5,
      p: 5,
      c: 5,
      comment:
        "Marcus traced a hidden wiring fault two other electricians could not find. Neat work, fair price and he explained everything. Highly recommended.",
    },
  },
  {
    bookingNumber: "BK-SEED-DEMO-COMPLETED-CLEAN",
    customerIndex: 1,
    providerIndex: 2,
    serviceIndex: 0,
    status: "completed",
    scheduledOffsetDays: -9,
    amount: 280,
    historyExtra: [
      { status: "accepted", by: "provider" },
      { status: "in_progress", by: "provider" },
      { status: "completed", by: "provider" },
    ],
    review: {
      overall: 5,
      q: 5,
      p: 4,
      c: 5,
      comment:
        "The SparkleHome team deep-cleaned our flat before a family visit — the kitchen was spotless. Punctual, professional and polite throughout.",
    },
  },
  {
    bookingNumber: "BK-SEED-DEMO-COMPLETED-PLUMB",
    customerIndex: 0,
    providerIndex: 3,
    serviceIndex: 0,
    status: "completed",
    scheduledOffsetDays: -14,
    amount: 240,
    historyExtra: [
      { status: "accepted", by: "provider" },
      { status: "in_progress", by: "provider" },
      { status: "completed", by: "provider" },
    ],
    review: {
      overall: 4,
      q: 4,
      p: 5,
      c: 4,
      comment:
        "Dave found the leak without breaking a single tile. Arrived on time; only wish he had carried the spare fitting with him to finish in one visit.",
    },
  },
  {
    bookingNumber: "BK-SEED-DEMO-COMPLETED-CARP",
    customerIndex: 1,
    providerIndex: 4,
    serviceIndex: 0,
    status: "completed",
    scheduledOffsetDays: -20,
    amount: 510,
    historyExtra: [
      { status: "accepted", by: "provider" },
      { status: "in_progress", by: "provider" },
      { status: "completed", by: "provider" },
    ],
    review: {
      overall: 5,
      q: 5,
      p: 5,
      c: 5,
      comment:
        "Oakline built our custom wardrobe exactly to the sketch. Excellent finish on the oak laminate and soft-close hardware as promised.",
    },
  },
  {
    bookingNumber: "BK-SEED-DEMO-QUOTATION-RENO",
    customerIndex: 0,
    providerIndex: 7,
    serviceIndex: 0,
    status: "quotation_sent",
    scheduledOffsetDays: 6,
    amount: null,
    historyExtra: [{ status: "accepted", by: "provider" }],
  },
  {
    bookingNumber: "BK-SEED-DEMO-PENDING-HVAC",
    customerIndex: 1,
    providerIndex: 5,
    serviceIndex: 0,
    status: "pending",
    scheduledOffsetDays: 3,
    amount: null,
    historyExtra: [],
  },
  {
    bookingNumber: "BK-SEED-DEMO-CONFIRMED-AC",
    customerIndex: 0,
    providerIndex: 1,
    serviceIndex: 1,
    status: "confirmed",
    scheduledOffsetDays: 2,
    amount: 85,
    historyExtra: [
      { status: "accepted", by: "provider" },
      { status: "confirmed", by: "provider" },
    ],
  },
];

type DemoChatLine = { from: "customer" | "provider"; body: string };

/** Scripted chat threads keyed by demo booking number (idempotent via first message body). */
const DEMO_CHATS: Partial<Record<(typeof DEMO_BOOKING_NUMBERS)[number], DemoChatLine[]>> = {
  "BK-SEED-DEMO-CONFIRMED-AC": [
    {
      from: "customer",
      body: "Hi! The AC service is confirmed for Thursday 11am. Should I keep the outdoor unit area clear?",
    },
    { from: "provider", body: "Yes please, and make sure the breaker is reachable. I will bring my own ladder and vacuum pump." },
    { from: "customer", body: "Perfect, see you Thursday." },
  ],
  "BK-SEED-DEMO-PENDING-HVAC": [
    {
      from: "customer",
      body: "Hi — I just submitted a booking for HVAC maintenance next week. Happy to share building access codes when you accept.",
    },
  ],
  "BK-SEED-DEMO-COMPLETED-ELECTRIC": [
    { from: "customer", body: "Thanks Marcus — everything works perfectly now." },
    { from: "provider", body: "Glad I could help. Reach out anytime if a breaker trips again." },
  ],
  "BK-SEED-DEMO-QUOTATION-RENO": [
    { from: "customer", body: "We are ready for the renovation quote whenever you can visit the flat." },
    {
      from: "provider",
      body: "I will send a formal quotation through the app after tomorrow's site survey — scope is strip-out, plaster and paint.",
    },
  ],
};

async function createUserViaAuth(name: string, email: string, password: string) {
  const auth = await getAuth();
  const res = await auth.api.signUpEmail({ body: { name, email, password } });
  return res.user.id;
}

/** When true, re-hash admin password from `ADMIN_SEED_PASSWORD` on every seed (default: enabled). */
function adminPasswordSyncEnabled(): boolean {
  return process.env.ADMIN_SEED_SYNC_PASSWORD !== "false";
}

/**
 * Better Auth stores passwords on `account` (providerId `credential`). A `user`
 * row without that document cannot sign in — repair or create it idempotently.
 */
async function ensureCredentialAccount(userId: string, password: string, updatePassword: boolean): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("[seed] database not connected");

  let userObjectId: mongoose.Types.ObjectId;
  try {
    userObjectId = new mongoose.Types.ObjectId(userId);
  } catch {
    return false;
  }

  const accounts = db.collection("account");
  const existing = await accounts.findOne({
    providerId: "credential",
    userId: userObjectId,
  });

  const hashed = await hashPassword(password);

  if (!existing) {
    await accounts.insertOne({
      accountId: userId,
      providerId: "credential",
      userId: userObjectId,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return true;
  }

  if (updatePassword) {
    await accounts.updateOne({ _id: existing._id }, { $set: { password: hashed, updatedAt: new Date() } });
    return true;
  }

  return false;
}

/** Reuse an existing auth user or create one (idempotent for partial / production seeds). */
async function ensureUserByEmail(name: string, email: string, password: string): Promise<string> {
  const normalized = email.toLowerCase();
  const existing = await User.findOne({ email: normalized }).select("_id");
  if (existing) {
    const id = String(existing._id);
    await ensureCredentialAccount(id, password, false);
    return id;
  }
  return createUserViaAuth(name, email, password);
}

/** Upsert categories & professions by slug — safe when real users already exist. */
async function ensureTaxonomy(): Promise<Map<string, string>> {
  const professionIdByName = new Map<string, string>();
  let order = 0;
  for (const cat of TAXONOMY) {
    const slug = slugify(cat.name);
    let category = await Category.findOne({ slug });
    if (!category) {
      category = await Category.create({
        name: cat.name,
        slug,
        icon: cat.icon,
        description: cat.description,
        order,
        isActive: true,
      });
    } else {
      await Category.updateOne(
        { _id: category._id },
        {
          $set: {
            name: cat.name,
            icon: cat.icon,
            description: cat.description,
            order,
            isActive: true,
          },
        },
      );
    }
    order += 1;
    for (const prof of cat.professions) {
      const pslug = slugify(prof.name);
      let created = await Profession.findOne({ slug: pslug });
      if (!created) {
        created = await Profession.create({
          categoryId: category._id,
          name: prof.name,
          slug: pslug,
          keywords: prof.keywords,
          isActive: true,
        });
      } else {
        await Profession.updateOne(
          { _id: created._id },
          {
            $set: {
              categoryId: category._id,
              name: prof.name,
              keywords: prof.keywords,
              isActive: true,
            },
          },
        );
      }
      professionIdByName.set(prof.name, String(created._id));
    }
  }
  return professionIdByName;
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_SEED_EMAIL || "admin@guild.app").toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD || "Admin@1234";
  const syncPassword = adminPasswordSyncEnabled();

  let adminId: string;
  const existing = await User.findOne({ email }).select("_id");
  if (existing) {
    adminId = String(existing._id);
  } else {
    adminId = await createUserViaAuth("Platform Admin", email, password);
  }

  const credentialTouched = await ensureCredentialAccount(adminId, password, syncPassword);

  await User.updateOne(
    { email },
    { $set: { role: "admin", emailVerified: true, name: "Platform Admin" } },
  );

  console.log(
    "[seed] admin ready:",
    email,
    credentialTouched ? (syncPassword ? "(password synced)" : "(credential created)") : "",
  );
}

type ProviderSeedResult = {
  providerUserIds: string[];
  providerServiceIds: Record<number, string[]>;
};

/** Create demo provider accounts missing from the database (by email). */
async function ensureDemoProviders(professionIdByName: Map<string, string>): Promise<ProviderSeedResult> {
  const providerUserIds: string[] = [];
  const providerServiceIds: Record<number, string[]> = {};

  for (let i = 0; i < PROVIDERS.length; i++) {
    const p = PROVIDERS[i];
    const userId = await ensureUserByEmail(p.name, p.email, DEMO_PASSWORD);
    const existingProfile = await ProviderProfile.findOne({ userId }).select("_id");
    if (existingProfile) {
      providerUserIds.push(userId);
      const serviceIds = await Service.find({ providerId: userId }).select("_id").lean();
      providerServiceIds[i] = serviceIds.map((s) => String(s._id));
      continue;
    }

    await User.updateOne({ _id: userId }, { $set: { role: "provider", emailVerified: true, phone: p.phone } });
    providerUserIds.push(userId);

    const profIds = p.professions.map((n) => professionIdByName.get(n)!).filter(Boolean);
    const categoryIds = [
      ...new Set(
        (await Profession.find({ _id: { $in: profIds } }).select("categoryId").lean()).map((x) => String(x.categoryId)),
      ),
    ];

    const profile = await ProviderProfile.create({
      userId,
      slug: `${slugify(p.name)}-${slugify(p.city)}-${100 + i}`,
      displayName: p.name,
      professionalTitle: p.title,
      bio: p.bio,
      professions: profIds,
      categoryIds,
      skills: p.skills,
      experienceYears: p.experienceYears,
      experienceSummary: "",
      languages: p.languages,
      phone: p.phone,
      whatsapp: p.phone,
      location: {
        country: p.country,
        city: p.city,
        area: p.area,
        coordinates: toGeoJSONPoint({ lat: p.lat, lng: p.lng }),
      },
      serviceAreas: p.serviceAreas.map((a) => ({
        name: a.name,
        city: p.city,
        radiusKm: a.radiusKm,
        coordinates: toGeoJSONPoint({ lat: p.lat + (Math.random() - 0.5) * 0.01, lng: p.lng + (Math.random() - 0.5) * 0.01 }),
      })),
      workingHours: {
        mon: [{ start: "09:00", end: "18:00" }],
        tue: [{ start: "09:00", end: "18:00" }],
        wed: [{ start: "09:00", end: "18:00" }],
        thu: [{ start: "09:00", end: "18:00" }],
        fri: [{ start: "09:00", end: "12:00" }],
        sat: [{ start: "10:00", end: "16:00" }],
        sun: null,
      },
      isAvailable: true,
      portfolio: p.images.map((n, idx) => ({ url: IMG(n), publicId: null, caption: `${p.name} — recent work ${idx + 1}`, order: idx })),
      certifications: p.verified
        ? [{ title: "Trade certification", issuer: "Regional trade licensing board", year: 2019, documentUrl: null }]
        : [],
      verification: { status: p.verified ? "verified" : "unverified", verifiedAt: p.verified ? new Date() : null },
      isSuspended: false,
    });

    providerServiceIds[i] = [];
    for (const s of p.services) {
      const existingService = await Service.findOne({ providerId: userId, title: s.title }).select("_id").lean();
      if (existingService) {
        providerServiceIds[i].push(String(existingService._id));
        continue;
      }
      const service = await Service.create({
        providerId: userId,
        providerProfileId: profile._id,
        title: s.title,
        description: s.description,
        categoryId: categoryIds[0] ?? null,
        professionId: professionIdByName.get(s.profession)!,
        images: [{ url: IMG(s.image), publicId: null }],
        pricingModel: s.model,
        price: s.price,
        currency: "USD",
        durationHours: s.durationHours,
        usesProfileAreas: true,
        isActive: true,
        stats: { views: Math.floor(Math.random() * 300) + 40, bookings: 0 },
      });
      providerServiceIds[i].push(String(service._id));
    }

    if (!p.verified && i === 1 && !(await VerificationRequest.exists({ userId }))) {
      await VerificationRequest.create({
        providerProfileId: profile._id,
        userId,
        documents: [
          { type: "id_document", label: "Government ID (front)", url: IMG(3, 600, 400), publicId: null },
          { type: "business_proof", label: "Trade license", url: IMG(4, 600, 400), publicId: null },
        ],
        status: "pending",
        history: [{ status: "pending", byUserId: userId, at: new Date(), note: "Submitted" }],
      });
      await ProviderProfile.updateOne({ _id: profile._id }, { $set: { "verification.status": "pending" } });
    }
  }

  return { providerUserIds, providerServiceIds };
}

async function ensureDemoCustomers(): Promise<string[]> {
  const customerIds: string[] = [];
  for (const c of CUSTOMERS) {
    const id = await ensureUserByEmail(c.name, c.email, DEMO_PASSWORD);
    await User.updateOne({ _id: id }, { $set: { role: "customer", emailVerified: true, phone: c.phone } });
    customerIds.push(id);
  }
  return customerIds;
}

async function demoCustomersComplete(): Promise<boolean> {
  const checks = await Promise.all(CUSTOMERS.map((c) => User.exists({ email: c.email.toLowerCase() })));
  return checks.every(Boolean);
}

async function demoBookingsComplete(): Promise<boolean> {
  const n = await Booking.countDocuments({ bookingNumber: { $in: [...DEMO_BOOKING_NUMBERS] } });
  return n >= DEMO_BOOKING_NUMBERS.length;
}

async function demoChatsComplete(): Promise<boolean> {
  for (const bookingNumber of Object.keys(DEMO_CHATS) as (keyof typeof DEMO_CHATS)[]) {
    const lines = DEMO_CHATS[bookingNumber];
    if (!lines?.length) continue;
    const booking = await Booking.findOne({ bookingNumber }).select("conversationId").lean();
    if (!booking?.conversationId) return false;
    const hasFirst = await Message.exists({ conversationId: booking.conversationId, body: lines[0].body });
    if (!hasFirst) return false;
  }
  return true;
}

type SeedBooking = {
  _id: unknown;
  bookingNumber: string;
  customerId: unknown;
  providerId: unknown;
  serviceId: unknown;
  conversationId: unknown;
};

const day = 24 * 3600 * 1000;

async function applyDemoBookingFields(
  bookingId: unknown,
  def: DemoBookingDef,
  customerId: string,
  service: { _id: unknown; providerId: unknown; pricingModel: string },
  convId: unknown,
): Promise<SeedBooking> {
  const customer = CUSTOMERS[def.customerIndex];
  await Booking.updateOne(
    { _id: bookingId },
    {
      $set: {
        bookingNumber: def.bookingNumber,
        customerId,
        providerId: service.providerId,
        serviceId: service._id,
        description: "Seed booking — please see the details discussed in chat. Access via main entrance; call on arrival.",
        address: {
          contactName: customer.name,
          contactPhone: customer.phone,
          city: customer.city,
          area: customer.area,
          streetAddress: customer.street,
          lat: null,
          lng: null,
        },
        scheduledDate: new Date(Date.now() + def.scheduledOffsetDays * day),
        scheduledTime: "11:00 – 14:00",
        pricing: { model: service.pricingModel, amount: def.amount, currency: "USD" },
        status: def.status,
        isOpen: isOpenStatus(def.status),
        conversationId: convId,
      },
    },
  );
  const doc = await Booking.findById(bookingId).lean();
  if (!doc) throw new Error(`seed: booking missing after update ${def.bookingNumber}`);
  return doc as SeedBooking;
}

async function ensureDemoBooking(
  def: DemoBookingDef,
  customerIds: string[],
  providerServiceIds: Record<number, string[]>,
): Promise<SeedBooking> {
  const existing = await Booking.findOne({ bookingNumber: def.bookingNumber }).lean();
  if (existing) {
    return existing as SeedBooking;
  }

  const customerId = customerIds[def.customerIndex];
  const serviceId = providerServiceIds[def.providerIndex]?.[def.serviceIndex];
  const service = await Service.findById(serviceId);
  if (!service) throw new Error(`seed: service missing for ${def.bookingNumber}`);

  const legacy = await Booking.findOne({
    customerId,
    serviceId: service._id,
    bookingNumber: { $regex: /^BK-SEED-[0-9]{4}$/ },
  }).lean();
  if (legacy && legacy.bookingNumber !== def.bookingNumber) {
    const convId =
      legacy.conversationId ??
      (await findOrCreateConversation(customerId, service.providerId as string, String(service._id)));
    const upgraded = await applyDemoBookingFields(legacy._id, def, customerId, service, convId);
    await ensureQuotationForDemoBooking(upgraded, def);
    return upgraded;
  }

  const convId = await findOrCreateConversation(customerId, service.providerId as string, String(service._id));
  const history: { status: string; byUserId: string; at: Date; note: string }[] = [
    { status: "pending", byUserId: customerId, at: new Date(Date.now() - 6 * day), note: "" },
  ];
  for (let i = 0; i < def.historyExtra.length; i++) {
    const h = def.historyExtra[i];
    history.push({
      status: h.status,
      byUserId: h.by === "customer" ? customerId : (service.providerId as string),
      at: new Date(Date.now() - (5 - i) * day),
      note: h.note ?? "",
    });
  }

  const customer = CUSTOMERS[def.customerIndex];
  const booking = await Booking.create({
    bookingNumber: def.bookingNumber,
    customerId,
    providerId: service.providerId,
    serviceId: service._id,
    description: "Seed booking — please see the details discussed in chat. Access via main entrance; call on arrival.",
    attachments: [],
    address: {
      contactName: customer.name,
      contactPhone: customer.phone,
      city: customer.city,
      area: customer.area,
      streetAddress: customer.street,
      lat: null,
      lng: null,
    },
    scheduledDate: new Date(Date.now() + def.scheduledOffsetDays * day),
    scheduledTime: "11:00 – 14:00",
    pricing: { model: service.pricingModel, amount: def.amount, currency: "USD" },
    status: def.status,
    isOpen: isOpenStatus(def.status),
    statusHistory: history,
    conversationId: convId,
  });

  await Service.updateOne({ _id: service._id }, { $inc: { "stats.bookings": 1 } });
  if (def.status === "completed" && def.amount) {
    await ProviderProfile.updateOne({ userId: service.providerId }, { $inc: { "stats.completedJobs": 1 } });
  }

  await ensureQuotationForDemoBooking(booking as SeedBooking, def);

  return booking as SeedBooking;
}

async function ensureQuotationForDemoBooking(booking: SeedBooking, def: DemoBookingDef): Promise<void> {
  if (def.bookingNumber !== "BK-SEED-DEMO-QUOTATION-RENO") return;
  const existingQuotation = await Quotation.findOne({ bookingId: booking._id }).lean();
  if (existingQuotation) return;
  const quotation = await Quotation.create({
    bookingId: booking._id,
    providerId: booking.providerId,
    customerId: booking.customerId,
    items: [
      { label: "Room renovation — strip-out, plaster & two-coat paint", amount: 950 },
      { label: "Waterproofing balcony slab", amount: 320 },
      { label: "Waste disposal & skip hire", amount: 120 },
    ],
    totalAmount: 1390,
    laborHours: 40,
    note: "Includes materials, labour and site protection. Work scheduled in two blocks over one week.",
    validUntil: new Date(Date.now() + 7 * day),
    status: "sent",
  });
  await Booking.updateOne(
    { _id: booking._id },
    {
      $set: { status: "quotation_sent", activeQuotationId: quotation._id, isOpen: isOpenStatus("quotation_sent") },
      $push: {
        statusHistory: {
          status: "quotation_sent",
          byUserId: booking.providerId,
          at: new Date(Date.now() - 1 * day),
          note: "",
        },
      },
    },
  );
}

async function ensureMessagesForBooking(booking: SeedBooking, bookingNumber: string): Promise<void> {
  const lines = DEMO_CHATS[bookingNumber as keyof typeof DEMO_CHATS];
  if (!lines?.length || !booking.conversationId) return;
  const convId = booking.conversationId;
  if (await Message.exists({ conversationId: convId, body: lines[0].body })) return;

  await Message.create(
    lines.map((line) => ({
      conversationId: convId,
      senderId: line.from === "customer" ? String(booking.customerId) : String(booking.providerId),
      type: "text" as const,
      body: line.body,
      readBy: line.from === "customer" ? [String(booking.customerId)] : [],
    })),
  );

  const last = lines[lines.length - 1];
  const lastSenderId = last.from === "customer" ? String(booking.customerId) : String(booking.providerId);
  const customerLines = lines.filter((l) => l.from === "customer").length;
  const update: Record<string, unknown> = {
    lastMessage: { body: last.body, senderId: lastSenderId, at: new Date() },
  };
  if (last.from === "customer" && customerLines > 0) {
    update.unread = { [String(booking.providerId)]: Math.min(customerLines, 3) };
  }
  await Conversation.updateOne({ _id: convId }, { $set: update });
}

async function ensureDemoReview(
  booking: SeedBooking,
  review: NonNullable<DemoBookingDef["review"]>,
): Promise<boolean> {
  if (await Review.exists({ bookingId: booking._id })) return false;
  await Review.create({
    bookingId: booking._id,
    customerId: booking.customerId,
    providerId: booking.providerId,
    serviceId: booking.serviceId,
    ratings: { overall: review.overall, quality: review.q, professionalism: review.p, communication: review.c },
    comment: review.comment,
    images: [],
  });
  return true;
}

async function ensureDemoExtras(
  customerIds: string[],
  providerUserIds: string[],
  bookingsByNumber: Record<string, SeedBooking>,
): Promise<void> {
  const c1 = customerIds[0];
  const c2 = customerIds[1];
  const pairs: [string, number][] = [
    [c1, 0],
    [c1, 2],
    [c2, 3],
  ];
  for (const [customerId, providerIndex] of pairs) {
    const providerId = providerUserIds[providerIndex];
    if (!(await Favorite.exists({ customerId, providerId }))) {
      await Favorite.create({ customerId, providerId });
    }
  }

  const confirmed = bookingsByNumber["BK-SEED-DEMO-CONFIRMED-AC"];
  if (confirmed) {
    const exists = await Notification.exists({
      userId: c1,
      type: "booking_status",
      "data.entityId": String(confirmed._id),
    });
    if (!exists) {
      await Notification.create({
        userId: c1,
        type: "booking_status",
        title: "Booking confirmed",
        body: "Your AC service booking is confirmed for Thursday.",
        data: { entityType: "booking", entityId: String(confirmed._id) },
      });
    }
  }

  const pending = bookingsByNumber["BK-SEED-DEMO-PENDING-HVAC"];
  if (pending) {
    const exists = await Notification.exists({
      userId: c2,
      type: "booking_status",
      "data.entityId": String(pending._id),
    });
    if (!exists) {
      await Notification.create({
        userId: c2,
        type: "booking_status",
        title: "Booking request sent",
        body: "Your HVAC maintenance request was sent. You will be notified when the provider responds.",
        data: { entityType: "booking", entityId: String(pending._id) },
      });
    }
  }

  const quoted = bookingsByNumber["BK-SEED-DEMO-QUOTATION-RENO"];
  if (quoted) {
    const exists = await Notification.exists({
      userId: c1,
      type: "booking_status",
      "data.entityId": String(quoted._id),
    });
    if (!exists) {
      await Notification.create({
        userId: c1,
        type: "booking_status",
        title: "Quotation received",
        body: "Cornerstone sent a renovation quotation — review line items and accept or decline in your booking.",
        data: { entityType: "booking", entityId: String(quoted._id) },
      });
    }
  }
}

async function main() {
  await connectDB();
  await ensureAdmin();

  const [categoryCount, providerCount] = await Promise.all([Category.countDocuments(), ProviderProfile.countDocuments()]);

  const needsTaxonomy = categoryCount < TAXONOMY.length;
  const needsDemoProviders = providerCount < PROVIDERS.length;
  const [customersOk, bookingsOk, chatsOk] = await Promise.all([
    demoCustomersComplete(),
    demoBookingsComplete(),
    demoChatsComplete(),
  ]);

  if (!needsTaxonomy && !needsDemoProviders && customersOk && bookingsOk && chatsOk) {
    const reviewCount = await Review.countDocuments({
      bookingId: { $in: (await Booking.find({ bookingNumber: { $in: [...DEMO_BOOKING_NUMBERS] } }).select("_id").lean()).map((b) => b._id) },
    });
    if (reviewCount >= 4) {
      console.log("[seed] marketplace data complete — skipping");
      return;
    }
  }

  if (needsTaxonomy || needsDemoProviders) {
    console.log("[seed] ensuring taxonomy and demo providers...", {
      categories: categoryCount,
      providers: providerCount,
    });
  }

  const professionIdByName = await ensureTaxonomy();
  console.log(`[seed] taxonomy ready: ${TAXONOMY.length} categories, ${professionIdByName.size} professions`);

  const { providerUserIds, providerServiceIds } = await ensureDemoProviders(professionIdByName);

  const customerIds = await ensureDemoCustomers();

  if (!bookingsOk || !chatsOk || !customersOk) {
    console.log("[seed] ensuring demo bookings, chats, and reviews...");
  }

  const bookingsByNumber: Record<string, SeedBooking> = {};
  for (const def of DEMO_BOOKINGS) {
    bookingsByNumber[def.bookingNumber] = await ensureDemoBooking(def, customerIds, providerServiceIds);
  }

  const providersWithNewReviews = new Set<string>();
  for (const def of DEMO_BOOKINGS) {
    const booking = bookingsByNumber[def.bookingNumber];
    if (def.review) {
      const created = await ensureDemoReview(booking, def.review);
      if (created) providersWithNewReviews.add(String(booking.providerId));
    }
    await ensureMessagesForBooking(booking, def.bookingNumber);
  }
  for (const pid of providersWithNewReviews) await recalcProviderRating(pid);
  if (providersWithNewReviews.size === 0) {
    const anyDemoReview = await Review.exists({
      bookingId: bookingsByNumber["BK-SEED-DEMO-COMPLETED-ELECTRIC"]?._id,
    });
    if (!anyDemoReview) {
      for (const pid of providerUserIds) await recalcProviderRating(pid);
    }
  }

  await ensureDemoExtras(customerIds, providerUserIds, bookingsByNumber);

  console.log("[seed] done:", {
    admin: 1,
    customers: customerIds.length,
    providers: providerUserIds.length,
    services: Object.values(providerServiceIds).flat().length,
    bookings: DEMO_BOOKINGS.length,
    demoChats: Object.keys(DEMO_CHATS).length,
  });
}

let seedPromise: Promise<void> | null = null;

/** Auto-seed entry point (called from lib/db on first boot). */
export async function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = main().catch((err) => {
      console.error("[seed] error:", err);
      seedPromise = null;
    });
  }
  return seedPromise;
}
