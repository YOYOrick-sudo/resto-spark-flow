import { SettingsModuleLayout } from "@/components/settings/layouts/SettingsModuleLayout";
import { algemeenConfig } from "@/lib/settingsRouteConfig";

export default function SettingsAlgemeenIndex() {
  return <SettingsModuleLayout config={algemeenConfig} />;
}
