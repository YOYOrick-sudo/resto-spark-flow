import { SettingsModuleLayout } from "@/components/settings/layouts";
import { marketingConfig } from "@/lib/settingsRouteConfig";

export default function MarketingSettings() {
  return <SettingsModuleLayout config={marketingConfig} />;
}
