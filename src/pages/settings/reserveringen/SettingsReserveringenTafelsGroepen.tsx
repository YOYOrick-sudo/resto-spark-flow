import { SettingsDetailLayout } from "@/components/settings/layouts";
import { TableGroupsSection } from "@/components/settings/tables";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Table groups list page
 */
export default function SettingsReserveringenTafelsGroepen() {
  const { currentLocation } = useUserContext();
  const breadcrumbs = buildBreadcrumbs("reserveringen", "tafels", "tafelgroepen");

  return (
    <SettingsDetailLayout
      title="Tafelcombinaties"
      description="Groepeer tafels die samen geboekt kunnen worden."
      backTo="/instellingen/reserveringen/tafels"
      backLabel="Tafelbeheer"
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-3xl">
        <TableGroupsSection locationId={currentLocation?.id} />
      </div>
    </SettingsDetailLayout>
  );
}
