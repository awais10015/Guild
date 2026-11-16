"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { GLOBAL_CITIES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountData {
  user: { name: string; email: string; phone: string; role: string; emailVerified: boolean };
  address: { label?: string; city?: string; area?: string; streetAddress?: string } | null;
}

export function SettingsForm() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setData(json.data);
      });
  }, []);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? "") || undefined,
          phone: String(form.get("phone") ?? "") || undefined,
          address: {
            label: "Home",
            city: String(form.get("city") ?? ""),
            area: String(form.get("area") ?? ""),
            streetAddress: String(form.get("street") ?? ""),
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success("Profile updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwBusy(true);
    const form = new FormData(e.currentTarget);
    const current = String(form.get("current") ?? "");
    const next = String(form.get("next") ?? "");
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      setPwBusy(false);
      return;
    }
    try {
      const res = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
      if (res.error) throw new Error(res.error.message ?? "Failed");
      toast.success("Password changed.");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setPwBusy(false);
    }
  }

  if (!data) return <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>{data.user.email}{data.user.emailVerified ? " · verified" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="st-name">Full name</Label>
                <Input id="st-name" name="name" defaultValue={data.user.name} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="st-phone">Mobile number</Label>
                <Input id="st-phone" name="phone" defaultValue={data.user.phone ?? ""} placeholder="03001234567" className="mt-1.5" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="st-city">City</Label>
                <Select name="city" defaultValue={data.address?.city ?? ""}>
                  <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {GLOBAL_CITIES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="st-area">Area</Label>
                <Input id="st-area" name="area" defaultValue={data.address?.area ?? ""} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="st-street">Street address</Label>
                <Input id="st-street" name="street" defaultValue={data.address?.streetAddress ?? ""} className="mt-1.5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Your address is private — it only pre-fills booking forms and is shared with providers you book.</p>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pw-current">Current password</Label>
                <Input id="pw-current" name="current" type="password" required autoComplete="current-password" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="pw-next">New password</Label>
                <Input id="pw-next" name="next" type="password" required minLength={8} autoComplete="new-password" className="mt-1.5" />
              </div>
            </div>
            <Button type="submit" variant="outline" disabled={pwBusy}>
              {pwBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
            </Button>
          </form>
          <Separator className="my-5" />
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium">{data.user.email}</span> ({data.user.role}).
            Roles are managed by the platform and cannot be self-assigned.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
