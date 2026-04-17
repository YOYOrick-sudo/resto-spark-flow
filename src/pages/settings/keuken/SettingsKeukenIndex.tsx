import { SettingsModuleLayout } from "@/components/settings/layouts/SettingsModuleLayout";
import { keukenConfig } from "@/lib/settingsRouteConfig";

export default function SettingsKeukenIndex() {
  return <SettingsModuleLayout config={keukenConfig} />;
}
