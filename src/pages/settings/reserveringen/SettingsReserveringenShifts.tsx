import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { TitleHelp, TitleHelpTip } from "@/components/polar/TitleHelp";
import { ShiftsTable, ShiftWizard, ShiftsLivePreviewPanel, ShiftExceptionsSection } from "@/components/settings/shifts";
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
      title={
        <span className="flex items-center gap-2">
          Shifts
          <TitleHelp title="Wat zijn shifts?">
            <p className="text-muted-foreground">
              Shifts bepalen wanneer gasten kunnen reserveren en welke regels dan gelden.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Elke shift heeft eigen tijden, dagen en intervals</li>
              <li>Volgorde bepaalt prioriteit bij overlapping</li>
              <li>Live preview rechts toont wat gasten zien</li>
            </ul>
            <TitleHelpTip>
              Tip: Start met 2 shifts (lunch + diner) en verfijn later met uitzonderingen.
            </TitleHelpTip>
          </TitleHelp>
        </span>
      }
      description="Beheer de shifts voor je restaurant. Shifts bepalen wanneer gasten kunnen reserveren."
      breadcrumbs={breadcrumbs}
      actions={
        <NestoButton onClick={() => setWizardOpen(true)} disabled={!locationId}>
          <Plus className="h-4 w-4 mr-1" />
          Nieuwe Shift
        </NestoButton>
      }
      aside={
        <ShiftsLivePreviewPanel
          shifts={activeShifts}
          isLoading={isLoading}
          locationId={locationId}
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

      </NestoCard>

      {/* Shift Exceptions Section */}
      {locationId && (
        <div className="mt-6">
          <ShiftExceptionsSection locationId={locationId} />
        </div>
      )}

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