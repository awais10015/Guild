import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export type GuildRole = "customer" | "provider" | "admin";

export interface GuildSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    phone?: string;
    role: GuildRole;
    banned?: boolean;
    banReason?: string | null;
  };
  session: { id: string; userId: string; expiresAt: Date };
}

/** Full session (null when signed out). Use in RSC pages + route handlers. */
export async function getSession(): Promise<GuildSession | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  return (session as unknown as GuildSession) ?? null;
}

/** Throws 401 when signed out. */
export async function requireUser(): Promise<GuildSession> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "You must be signed in.");
  return session;
}

/** Throws 401/403 when the role does not match. */
export async function requireRole(...roles: GuildRole[]): Promise<GuildSession> {
  const session = await requireUser();
  if (!roles.includes(session.user.role)) {
    throw new ApiError(403, "You do not have permission to do that.");
  }
  return session;
}
