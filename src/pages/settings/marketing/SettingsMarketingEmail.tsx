import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import EmailSettingsTab from "@/components/marketing/settings/EmailSettingsTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingEmail() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="Email"
      description="E-mail configuratie en templates."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "Email" },
      ]}
    >
      <EmailSettingsTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
