import { SettingsDetailLayout } from "@/components/settings/layouts";
import { TableGroupsSection } from "@/components/settings/tables";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { TitleHelp } from "@/components/polar/TitleHelp";

/**
 * Niveau 4: Table groups list page
 */
export default function SettingsReserveringenTafelsGroepen() {
  const { currentLocation } = useUserContext();
  const breadcrumbs = buildBreadcrumbs("reserveringen", "tafels", "tafelgroepen");

  return (
    <SettingsDetailLayout
      title={
        <span className="flex items-center gap-2">
          Tafelcombinaties
          <TitleHelp title="Wat zijn tafelcombinaties?">
            <p className="text-muted-foreground">Groepeer tafels die samen geboekt kunnen worden voor grotere gezelschappen.</p>
          </TitleHelp>
        </span>
      }
      description="Groepeer tafels die samen geboekt kunnen worden."
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-3xl">
        <TableGroupsSection locationId={currentLocation?.id} />
      </div>
    </SettingsDetailLayout>
  );
}
