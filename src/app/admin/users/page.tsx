import { PageHeader } from "@/components/shared/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminUserActions } from "@/components/admin/actions";
import { requireRole } from "@/lib/guards";
import { listUsers } from "@/server/services/admin-service";
import { formatDate, initials } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  await requireRole("admin");
  const { q, role, page } = await searchParams;
  const result = await listUsers({ q, role, page: Number(page) || 1 });

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, role, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/admin/users?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Users & providers" description={`${result.total} accounts`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action="/admin/users" className="flex gap-2">
          <Input name="q" placeholder="Search name or email…" defaultValue={q ?? ""} className="w-64" />
          {role && <input type="hidden" name="role" value={role} />}
          <Input type="submit" value="Search" className="w-fit cursor-pointer" />
        </form>
        <Tabs value={role ?? "all"}>
          <TabsList className="h-auto flex-wrap gap-1">
            <TabsTrigger value="all" asChild><Link href={qs({ role: undefined, page: undefined })}>All</Link></TabsTrigger>
            <TabsTrigger value="customer" asChild><Link href={qs({ role: "customer", page: undefined })}>Customers</Link></TabsTrigger>
            <TabsTrigger value="provider" asChild><Link href={qs({ role: "provider", page: undefined })}>Providers</Link></TabsTrigger>
            <TabsTrigger value="admin" asChild><Link href={qs({ role: "admin", page: undefined })}>Admins</Link></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {u.image ? <AvatarImage src={u.image} alt={u.name} /> : null}
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(u.name || u.email)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 capitalize">{u.role}</td>
                    <td className="p-3.5">
                      {u.banned ? (
                        <span className="text-red-500">Suspended{u.banReason ? ` — ${u.banReason}` : ""}</span>
                      ) : u.providerSuspended ? (
                        <span className="text-amber-600">Listings hidden</span>
                      ) : u.verificationStatus === "verified" ? (
                        <span className="text-emerald-600">Verified</span>
                      ) : (
                        <span className="text-muted-foreground">Active</span>
                      )}
                    </td>
                    <td className="p-3.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="p-3.5">
                      <AdminUserActions
                        userId={u.id}
                        banned={u.banned}
                        isProvider={u.role === "provider"}
                        providerSuspended={u.providerSuspended}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {result.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(result.pages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={qs({ page: String(p) })}
              className={`rounded-lg border px-3 py-1.5 text-sm ${p === result.page ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
