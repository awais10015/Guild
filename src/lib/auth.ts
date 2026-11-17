import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { MongoClient, type Db } from "mongodb";
import { connectDB } from "@/lib/db";
import { sendMail, mailEnabled } from "@/lib/mail";
import { mongoDbName, mongoUri } from "@/lib/mongodb";

const globalForAuth = globalThis as unknown as {
  __guildAuth: ReturnType<typeof createAuth> | null;
  __guildAuthClient: MongoClient | null;
};

/**
 * Better Auth gets its OWN MongoDB client (same database as Mongoose).
 * This avoids BSON version conflicts between the standalone `mongodb`
 * driver used by the adapter and the driver bundled inside Mongoose.
 */
async function getAuthDb(): Promise<Db> {
  if (!globalForAuth.__guildAuthClient) {
    const client = new MongoClient(mongoUri(), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    await client.connect();
    globalForAuth.__guildAuthClient = client;
  }
  const client = globalForAuth.__guildAuthClient;
  return client.db(mongoDbName());
}

function authTrustedOrigins(): string[] {
  const origins = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ]) {
    const v = raw?.trim();
    if (!v) continue;
    origins.add(v.replace(/\/$/, ""));
  }
  return [...origins];
}

function createAuth(db: Db) {
  const requireVerification = process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";
  const trustedOrigins = authTrustedOrigins();

  return betterAuth({
    appName: "Guild",
    secret: process.env.BETTER_AUTH_SECRET || "guild-dev-secret-change-me-in-production",
    database: mongodbAdapter(db),
    ...(trustedOrigins.length ? { trustedOrigins } : {}),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: requireVerification,
      minPasswordLength: 8,
      maxPasswordLength: 72,
      sendResetPassword: async ({ user, url }) => {
        if (!mailEnabled) {
          console.log(`[MAIL:password-reset] to=${user.email} url=${url}`);
          return;
        }
        await sendMail({
          to: user.email,
          subject: "Reset your Guild password",
          text: `Hi ${user.name},\n\nReset your password using the link below (valid for 1 hour):\n${url}\n\nIf you didn't request this, you can ignore this email.`,
        });
      },
    },

    emailVerification: {
      sendOnSignUp: requireVerification,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        if (!mailEnabled) {
          console.log(`[MAIL:email-verification] to=${user.email} url=${url}`);
          return;
        }
        await sendMail({
          to: user.email,
          subject: "Verify your Guild email",
          text: `Welcome to Guild, ${user.name}!\n\nVerify your email address:\n${url}`,
        });
      },
    },

    user: {
      additionalFields: {
        phone: { type: "string", required: false, defaultValue: "" },
      },
    },

    /** every new account is a customer; role changes are server-side only */
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, role: "customer" } }),
        },
      },
    },

    plugins: [admin()],
    rateLimit: { enabled: true, window: 60, max: 60 },
  });
}

/** Lazily build the Better Auth instance once the DB connection exists. */
export async function getAuth() {
  if (!globalForAuth.__guildAuth) {
    await connectDB();
    const db = await getAuthDb();
    globalForAuth.__guildAuth = createAuth(db);
  }
  return globalForAuth.__guildAuth;
}
