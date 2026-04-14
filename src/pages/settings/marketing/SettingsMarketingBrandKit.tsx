import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import BrandKitTab from "@/components/marketing/settings/BrandKitTab";
import { usePermission } from "@/hooks/usePermission";

export default function SettingsMarketingBrandKit() {
  const canManage = usePermission("marketing.manage");
  return (
    <SettingsDetailLayout
      title="Brand Kit"
      description="Huisstijl, logo en branding."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Marketing", path: "/instellingen/marketing" },
        { label: "Brand Kit" },
      ]}
    >
      <BrandKitTab readOnly={!canManage} />
    </SettingsDetailLayout>
  );
}
