import { SiteHeader } from "@/components/layout/site-header";

/** Signed-in app surfaces: global header + full-width body below it. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {children}
    </div>
  );
}