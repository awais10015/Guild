/** Shared MongoDB URI / database name resolution for Mongoose + Better Auth. */

export const DEFAULT_MONGODB_URI =
  "mongodb://127.0.0.1:27017/guild?replicaSet=rs0&directConnection=true";

export const DEFAULT_DB_NAME = "guild";

export function mongoUri(): string {
  return process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
}

/** Database name on the cluster — must match for auth and domain collections. */
export function mongoDbName(uri = mongoUri()): string {
  const fromEnv = process.env.DB_NAME?.trim();
  if (fromEnv) return fromEnv;
  try {
    const path = new URL(uri).pathname.replace(/^\//, "").split("/")[0];
    if (path) return path.split("?")[0] || DEFAULT_DB_NAME;
  } catch {
    /* fall through */
  }
  return DEFAULT_DB_NAME;
}