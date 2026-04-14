import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import SocialAccountsTab from "@/components/marketing/settings/SocialAccountsTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingSocial() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="Social Accounts"
      description="Social media koppelingen."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "Social Accounts" },
      ]}
    >
      <SocialAccountsTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
