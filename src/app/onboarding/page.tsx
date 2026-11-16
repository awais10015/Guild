import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { Link } from "lucide-react";

export const metadata: Metadata = { title: "Set up your account" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            { }
            <img src="/logo.svg" alt="Guild" className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">Guild</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <Suspense>
          <OnboardingWizard />
        </Suspense>
      </main>
    </div>
  );
}
