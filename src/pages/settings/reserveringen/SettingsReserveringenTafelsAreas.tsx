import { SettingsDetailLayout } from "@/components/settings/layouts";
import { AreasSection } from "@/components/settings/tables";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Areas list page
 */
export default function SettingsReserveringenTafelsAreas() {
  const { currentLocation } = useUserContext();
  const breadcrumbs = buildBreadcrumbs("reserveringen", "tafels", "areas");

  return (
    <SettingsDetailLayout
      title="Areas"
      description="Beheer ruimtes en de tafels daarin."
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-4xl">
        <AreasSection locationId={currentLocation?.id} />
      </div>
    </SettingsDetailLayout>
  );
}
