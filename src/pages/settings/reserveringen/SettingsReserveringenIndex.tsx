import { SettingsModuleLayout } from "@/components/settings/layouts";
import { reserveringenConfig } from "@/lib/settingsRouteConfig";

/**
 * Niveau 2: Reserveringen module index page
 * Shows all settings sections as cards
 */
export default function SettingsReserveringenIndex() {
  return <SettingsModuleLayout config={reserveringenConfig} />;
}
