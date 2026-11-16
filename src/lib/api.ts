import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

/** Wraps a route handler with consistent error handling.
 *  The context type is generic so each route's params shape stays intact. */
export function handle<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return fail(err.status, err.message, err.details);
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return fail(422, first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.", err.flatten());
      }
      console.error("[api] unhandled error:", err);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }
}
