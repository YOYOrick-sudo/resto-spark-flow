import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import PopupSettingsTab from "@/components/marketing/settings/PopupSettingsTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingPopup() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="Website Popup"
      description="Pop-up widget configuratie."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "Website Popup" },
      ]}
    >
      <PopupSettingsTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
