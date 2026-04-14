import { SettingsModuleLayout } from "@/components/settings/layouts";
import { assistentConfig } from "@/lib/settingsRouteConfig";

export default function SettingsAssistent() {
  return <SettingsModuleLayout config={assistentConfig} />;
}
