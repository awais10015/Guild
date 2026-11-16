import { Schema, model, models, type InferSchemaType } from "mongoose";

export const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const;

const workingHoursSub = new Schema(
  { start: String, end: String },
  { _id: false },
);

const providerProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },

    professionalTitle: { type: String, default: "" },
    bio: { type: String, default: "" },

    professions: [{ type: Schema.Types.ObjectId, ref: "Profession", index: true }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],

    skills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0 },
    experienceSummary: { type: String, default: "" },
    languages: { type: [String], default: [] },

    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },

    /* registered location — public, approximate (never street-level) */
    location: {
      country: { type: String, default: "" },
      city: { type: String, default: "", index: true },
      area: { type: String, default: "" },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
    },

    /* where they actually work — one or many */
    serviceAreas: [
      new Schema(
        {
          name: { type: String, required: true },
          city: { type: String, required: true },
          coordinates: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true },
          },
          radiusKm: { type: Number, default: 10 },
        },
        { _id: false },
      ),
    ],

    workingHours: { type: Schema.Types.Mixed, default: {} },
    isAvailable: { type: Boolean, default: true, index: true },

    portfolio: [
      new Schema(
        {
          url: { type: String, required: true },
          publicId: { type: String, default: null },
          caption: { type: String, default: "" },
          order: { type: Number, default: 0 },
        },
        { _id: false },
      ),
    ],
    certifications: [
      new Schema(
        {
          title: { type: String, required: true },
          issuer: { type: String, default: "" },
          year: { type: Number },
          documentUrl: { type: String, default: null },
        },
        { _id: false },
      ),
    ],

    verification: {
      status: {
        type: String,
        enum: VERIFICATION_STATUSES,
        default: "unverified",
        index: true,
      },
      verifiedAt: { type: Date, default: null },
    },

    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    stats: {
      profileViews: { type: Number, default: 0 },
      completedJobs: { type: Number, default: 0 },
    },

    isSuspended: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

providerProfileSchema.index({ "location.coordinates": "2dsphere" });
providerProfileSchema.index({ "serviceAreas.coordinates": "2dsphere" });
providerProfileSchema.index(
  { professions: 1, "verification.status": 1, isSuspended: 1 },
);
providerProfileSchema.index({ "rating.average": -1 });
providerProfileSchema.index(
  { displayName: "text", professionalTitle: "text", bio: "text", skills: "text" },
  { weights: { displayName: 8, professionalTitle: 10, skills: 4, bio: 1 }, name: "provider_text" },
);

export type ProviderProfileDoc = InferSchemaType<typeof providerProfileSchema>;
export const ProviderProfile =
  models.ProviderProfile ?? model("ProviderProfile", providerProfileSchema);
