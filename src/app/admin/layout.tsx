import { redirect } from "next/navigation";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { getSession } from "@/lib/guards";
import { connectDB } from "@/lib/db";
import { Report, VerificationRequest } from "@/models";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.user.role !== "admin") {
    redirect(session.user.role === "provider" ? "/provider" : "/dashboard");
  }
  await connectDB();

  const [pendingVerification, openReports] = await Promise.all([
    VerificationRequest.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: { $in: ["open", "investigating"] } }),
  ]);

  const nav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: "layout-dashboard" },
    { href: "/admin/users", label: "Users & providers", icon: "users" },
    { href: "/admin/verification", label: "Verification", icon: "shield-check", badge: pendingVerification || undefined },
    { href: "/admin/bookings", label: "Bookings", icon: "calendar-check" },
    { href: "/admin/reports", label: "Reports", icon: "flag", badge: openReports || undefined },
    { href: "/admin/reviews", label: "Review moderation", icon: "star" },
    { href: "/admin/categories", label: "Categories & professions", icon: "tags" },
  ];

  return (
    <DashboardShell nav={nav} title="Admin console" subtitle="Guild platform">
      {children}
    </DashboardShell>
  );
}
