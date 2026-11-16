import { redirect } from "next/navigation";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";

export default async function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");
  if (session.user.role === "provider") redirect("/provider");
  if (session.user.role === "admin") redirect("/admin");
  await connectDB();

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
    { href: "/dashboard/bookings", label: "My bookings", icon: "calendar-check" },
    { href: "/dashboard/favorites", label: "Favorites", icon: "heart" },
    { href: "/dashboard/reviews", label: "My reviews", icon: "star" },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <DashboardShell nav={nav} title="Dashboard" subtitle={session.user.name}>
      {children}
    </DashboardShell>
  );
}
