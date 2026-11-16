import { Schema, model, models, type InferSchemaType } from "mongoose";

const verificationRequestSchema = new Schema(
  {
    providerProfileId: { type: Schema.Types.ObjectId, ref: "ProviderProfile", required: true },
    userId: { type: String, required: true, index: true },

    documents: [
      new Schema(
        {
          type: { type: String, enum: ["id_document", "license", "certificate", "business_proof"], required: true },
          label: { type: String, required: true },
          url: { type: String, required: true },
          publicId: { type: String, default: null },
        },
        { _id: false },
      ),
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: "" },
    history: [
      new Schema(
        {
          status: String,
          byUserId: String,
          at: { type: Date, default: Date.now },
          note: { type: String, default: "" },
        },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);

verificationRequestSchema.index({ status: 1, submittedAt: 1 });

export type VerificationRequestDoc = InferSchemaType<typeof verificationRequestSchema>;
export const VerificationRequest =
  models.VerificationRequest ?? model("VerificationRequest", verificationRequestSchema);
