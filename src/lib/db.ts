import mongoose, { type Mongoose } from "mongoose";
import { mongoDbName, mongoUri } from "@/lib/mongodb";

const globalForMongoose = globalThis as unknown as {
  mongoosePromise: Promise<Mongoose> | null;
};

async function tryConnect(uri: string, dbName: string): Promise<Mongoose> {
  const lastDelay = 2000;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 6000,
        maxPoolSize: 20,
      });
    } catch (err) {
      if (attempt === 6) throw err;
      console.warn(`[db] connect attempt ${attempt} failed, retrying...`);
      await new Promise((r) => setTimeout(r, lastDelay));
    }
  }
  throw new Error("unreachable");
}

/**
 * Idempotent connection with retry (mongod may still be booting when the
 * first request arrives). Registers all models and kicks off auto-seed.
 */
export async function connectDB(): Promise<Mongoose> {
  if (!globalForMongoose.mongoosePromise) {
    const uri = mongoUri();
    const dbName = mongoDbName(uri);
    globalForMongoose.mongoosePromise = (async () => {
      const mongoose = await tryConnect(uri, dbName);
      // register models
      await import("@/models");
      // fire-and-forget auto seed (never blocks requests)
      const autoSeed =
        process.env.AUTO_SEED === "true" ||
        (process.env.NODE_ENV === "production" && process.env.AUTO_SEED !== "false");
      if (autoSeed) {
        void import("@/server/seed")
          .then((m) => m.ensureSeed())
          .catch((err) => console.error("[seed] failed:", err));
      }
      return mongoose;
    })();
  }
  try {
    return await globalForMongoose.mongoosePromise;
  } catch (err) {
    globalForMongoose.mongoosePromise = null;
    throw err;
  }
}

export { mongoose };
