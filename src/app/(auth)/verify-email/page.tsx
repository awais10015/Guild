"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"idle" | "verifying" | "success" | "error">(token ? "verifying" : "idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authClient.verifyEmail({ query: { token } }).then((res) => {
      if (cancelled) return;
      if (res.error) {
        setState("error");
        setMessage(res.error.message ?? "Verification failed or link expired.");
      } else {
        setState("success");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto">
          {state === "success" ? (
            <BadgeCheck className="h-12 w-12 text-emerald-500" />
          ) : state === "error" ? (
            <XCircle className="h-12 w-12 text-red-500" />
          ) : (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
        </div>
        <CardTitle className="mt-3 text-xl">
          {state === "success" ? "Email verified!" : state === "error" ? "Verification failed" : "Verifying your email…"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state === "error" && <p className="text-sm text-muted-foreground">{message}</p>}
        {state === "success" && <p className="text-sm text-muted-foreground">Your account is ready. Redirecting you…</p>}
        {state !== "verifying" && (
          <Button asChild className="mt-5 w-full">
            <Link href={state === "success" ? "/dashboard" : "/login"}>
              {state === "success" ? "Go to dashboard" : "Back to sign in"}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* useSearchParams must sit behind a Suspense boundary for static prerender */
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
