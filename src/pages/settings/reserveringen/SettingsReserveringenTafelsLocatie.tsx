import { SettingsDetailLayout } from "@/components/settings/layouts";
import { LocationSettingsCard } from "@/components/settings/tables";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Location settings page
 */
export default function SettingsReserveringenTafelsLocatie() {
  const { currentLocation } = useUserContext();
  const breadcrumbs = buildBreadcrumbs("reserveringen", "tafels", "locatie");

  return (
    <SettingsDetailLayout
      title="Locatie-instellingen"
      description="Algemene reserveringsinstellingen voor deze locatie."
      backTo="/instellingen/reserveringen/tafels"
      backLabel="Tafelbeheer"
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-2xl">
        <LocationSettingsCard locationId={currentLocation?.id} />
      </div>
    </SettingsDetailLayout>
  );
}
