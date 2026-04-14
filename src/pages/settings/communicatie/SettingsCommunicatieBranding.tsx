import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { BrandingTab } from "@/components/settings/communication/BrandingTab";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

export default function SettingsCommunicatieBranding() {
  const breadcrumbs = buildBreadcrumbs("communicatie", "branding");

  return (
    <SettingsDetailLayout
      title="Branding"
      description="Logo, kleuren en footer."
      breadcrumbs={breadcrumbs}
    >
      <BrandingTab />
    </SettingsDetailLayout>
  );
}
