import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            { }
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-bold">{APP_NAME}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Skilled professionals, on demand — anywhere in the world. Hire with confidence, get paid for your craft.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">For customers</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/professionals">Find professionals</Link></li>
            <li><Link className="hover:text-foreground" href="/categories">Browse categories</Link></li>
            <li><Link className="hover:text-foreground" href="/how-it-works">How it works</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">For professionals</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/register">Join as a professional</Link></li>
            <li><Link className="hover:text-foreground" href="/how-it-works">Why Guild</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/categories">Categories</Link></li>
            <li><Link className="hover:text-foreground" href="/professionals">Search</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Connect locally, hire with confidence.
        </p>
      </div>
    </footer>
  );
}
