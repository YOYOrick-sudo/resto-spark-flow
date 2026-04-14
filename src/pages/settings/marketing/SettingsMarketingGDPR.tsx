import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import GDPRTab from "@/components/marketing/settings/GDPRTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingGDPR() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="GDPR"
      description="Privacy, consent en dataverwerking."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "GDPR" },
      ]}
    >
      <GDPRTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
