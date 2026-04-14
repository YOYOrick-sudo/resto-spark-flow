import { SettingsModuleLayout } from "@/components/settings/layouts";
import { communicatieConfig } from "@/lib/settingsRouteConfig";

export default function SettingsCommunicatie() {
  return <SettingsModuleLayout config={communicatieConfig} />;
}
