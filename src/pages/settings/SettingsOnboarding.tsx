import { SettingsModuleLayout } from "@/components/settings/layouts";
import { onboardingConfig } from "@/lib/settingsRouteConfig";

export default function SettingsOnboarding() {
  return <SettingsModuleLayout config={onboardingConfig} />;
}
