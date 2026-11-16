import { PageHeader } from "@/components/shared/misc";
import { SettingsForm } from "@/components/customer/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Account settings" description="Manage your profile, address and security." />
      <SettingsForm />
    </div>
  );
}
