import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import AlgemeenTab from "@/components/marketing/settings/AlgemeenTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingAlgemeen() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="Algemeen"
      description="Module status, email frequentie en verzendtijd."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "Algemeen" },
      ]}
    >
      <AlgemeenTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
