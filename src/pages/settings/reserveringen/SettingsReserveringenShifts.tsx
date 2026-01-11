import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { ShiftsTable, ShiftWizard, ShiftsLivePreviewPanel } from "@/components/settings/shifts";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useAllShifts } from "@/hooks/useShifts";
import { useUserContext } from "@/contexts/UserContext";

export default function SettingsReserveringenShifts() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const { data: allShifts = [], isLoading } = useAllShifts(locationId);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Filter active shifts once here - passed to preview
  const activeShifts = useMemo(
    () => allShifts.filter((s) => s.is_active),
    [allShifts]
  );

  const breadcrumbs = buildBreadcrumbs("reserveringen", "shifts");

  return (
    <SettingsDetailLayout
      title="Shifts"
      description="Beheer de shifts voor je restaurant. Shifts bepalen wanneer gasten kunnen reserveren."
      breadcrumbs={breadcrumbs}
      actions={
        <NestoButton onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nieuwe Shift
        </NestoButton>
      }
      aside={
        <ShiftsLivePreviewPanel
          shifts={activeShifts}
          isLoading={isLoading}
          onOpenWizard={() => setWizardOpen(true)}
        />
      }
    >
      <NestoCard className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Shift overzicht</h3>
          <p className="text-sm text-muted-foreground">
            Versleep shifts om de prioriteit te wijzigen. Shifts worden in volgorde getoond in de
            reserveringsweergave.
          </p>
        </div>

        {locationId ? (
          <ShiftsTable locationId={locationId} />
        ) : (
          <p className="text-sm text-muted-foreground">Geen locatie geselecteerd.</p>
        )}

        {/* Exceptions Placeholder */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-dashed">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">Shift Exceptions</span>
            <NestoBadge variant="soon" className="text-xs">
              Coming soon
            </NestoBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            Binnenkort: beheer afwijkende dagen zoals feestdagen, speciale openingstijden, of
            sluitingen per shift.
          </p>
        </div>
      </NestoCard>

      {/* Wizard for creating new shift */}
      {locationId && (
        <ShiftWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          locationId={locationId}
          editingShift={null}
        />
      )}
    </SettingsDetailLayout>
  );
}