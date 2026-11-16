"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

export type SessionData = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    phone?: string;
    role: "customer" | "provider" | "admin";
  };
  session: { id: string; expiresAt: Date };
} | null;
