import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { WhatsAppTab } from "@/components/settings/communication/WhatsAppTab";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

export default function SettingsCommunicatieWhatsApp() {
  const breadcrumbs = buildBreadcrumbs("communicatie", "whatsapp");

  return (
    <SettingsDetailLayout
      title="WhatsApp"
      description="WhatsApp kanaal instellingen."
      breadcrumbs={breadcrumbs}
    >
      <WhatsAppTab />
    </SettingsDetailLayout>
  );
}
