import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader title="Settings" description="Manage your public profile, security and notification preferences." />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav />
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
