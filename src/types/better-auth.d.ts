import type { DefaultSession } from "better-auth/types";

declare module "better-auth/types" {
  interface User {
    phone?: string;
  }
  interface Session {
    user: {
      phone?: string;
    } & DefaultSession["user"];
  }
}

export {};
