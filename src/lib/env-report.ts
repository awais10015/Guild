/**
 * Startup environment report — prints a clear summary so a missing variable
 * is obvious in the first second instead of surfacing as a runtime error.
 */

interface Check {
  vars: string[];
  label: string;
  required: boolean;
}

const CHECKS: Check[] = [
  { vars: ["MONGODB_URI"], label: "MongoDB connection", required: true },
  { vars: ["DB_NAME"], label: "MongoDB database name (required when URI has no /dbname)", required: false },
  { vars: ["BETTER_AUTH_SECRET"], label: "Auth secret", required: true },
  { vars: ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"], label: "Pusher realtime (server)", required: false },
  { vars: ["NEXT_PUBLIC_PUSHER_KEY", "NEXT_PUBLIC_PUSHER_CLUSTER"], label: "Pusher realtime (browser)", required: false },
  { vars: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"], label: "Cloudinary media uploads", required: false },
];

export function reportEnv(): void {
  const missingRequired = CHECKS.filter((c) => c.required && c.vars.some((v) => !process.env[v]));
  const missingOptional = CHECKS.filter((c) => !c.required && c.vars.some((v) => !process.env[v]));

  if (missingRequired.length > 0) {
    console.error(
      "──────────────────────────────────────────────────────\n" +
        "  Guild cannot start correctly — required env variables missing:\n" +
        missingRequired.map((c) => `  ✗ ${c.label}: ${c.vars.join(", ")}`).join("\n") +
        "\n  Copy .env.example to .env and fill in the values.\n" +
        "──────────────────────────────────────────────────────",
    );
  }
  for (const c of missingOptional) {
    console.warn(
      `[env] ${c.label} not fully configured (missing: ${c.vars.filter((v) => !process.env[v]).join(", ")}). ` +
        "Related features are disabled and will show clear error messages instead.",
    );
  }
}
