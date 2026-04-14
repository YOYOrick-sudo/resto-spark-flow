import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { GastberichtenTab } from "@/components/settings/communication/GastberichtenTab";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

export default function SettingsCommunicatieGastberichten() {
  const breadcrumbs = buildBreadcrumbs("communicatie", "gastberichten");

  return (
    <SettingsDetailLayout
      title="Gastberichten"
      description="Berichten naar gasten configureren."
      breadcrumbs={breadcrumbs}
    >
      <GastberichtenTab />
    </SettingsDetailLayout>
  );
}
