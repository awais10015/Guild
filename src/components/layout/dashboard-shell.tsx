"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu, LayoutDashboard, Users, ShieldCheck, CalendarCheck, Flag, Star, Tags,
  Heart, Settings, Briefcase, Clock, BarChart3, UserRound,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Nav items cross the server→client boundary, so icons travel as names:
 * Lucide component references are not serializable from server layouts.
 */
export type NavIcon =
  | "layout-dashboard" | "users" | "shield-check" | "calendar-check"
  | "flag" | "star" | "tags" | "heart" | "settings" | "briefcase"
  | "clock" | "bar-chart-3" | "user-round";

const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "shield-check": ShieldCheck,
  "calendar-check": CalendarCheck,
  flag: Flag,
  star: Star,
  tags: Tags,
  heart: Heart,
  settings: Settings,
  briefcase: Briefcase,
  clock: Clock,
  "bar-chart-3": BarChart3,
  "user-round": UserRound,
};

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: number;
}

function NavLinks({
  nav,
  pathname,
  onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  nav,
  title,
  subtitle,
  children,
}: {
  nav: NavItem[];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-sidebar p-4 lg:block">
        <div className="mb-4 px-2">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <NavLinks nav={nav} pathname={pathname} />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b px-4 py-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto">
              <SheetTitle>{title}</SheetTitle>
              <div className="mt-4">
                <NavLinks nav={nav} pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">{title}</span>
        </div>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
