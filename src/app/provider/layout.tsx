import { redirect } from "next/navigation";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Booking } from "@/models";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/provider");
  if (session.user.role !== "provider") {
    redirect(session.user.role === "admin" ? "/admin" : "/onboarding");
  }
  await connectDB();

  const pending = await Booking.countDocuments({ providerId: session.user.id, status: "pending" });

  const nav: NavItem[] = [
    { href: "/provider", label: "Overview", icon: "layout-dashboard" },
    { href: "/provider/bookings", label: "Requests & jobs", icon: "calendar-check", badge: pending || undefined },
    { href: "/provider/services", label: "My services", icon: "briefcase" },
    { href: "/provider/profile", label: "Public profile", icon: "user-round" },
    { href: "/provider/availability", label: "Availability", icon: "clock" },
    { href: "/provider/verification", label: "Verification", icon: "shield-check" },
    { href: "/provider/analytics", label: "Analytics", icon: "bar-chart-3" },
  ];

  return (
    <DashboardShell nav={nav} title="Provider studio" subtitle={session.user.name}>
      {children}
    </DashboardShell>
  );
}
