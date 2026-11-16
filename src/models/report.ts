import { Schema, model, models, type InferSchemaType } from "mongoose";
import { REPORT_REASONS, REPORT_TARGET_TYPES } from "@/lib/constants";

const reportSchema = new Schema(
  {
    reporterId: { type: String, required: true, index: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: String, required: true, index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    description: { type: String, required: true },

    status: {
      type: String,
      enum: ["open", "investigating", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    resolutionNote: { type: String, default: "" },
    handledBy: { type: String, default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });

export type ReportDoc = InferSchemaType<typeof reportSchema>;
export const Report = models.Report ?? model("Report", reportSchema);
