import { useMemo } from "react";
import { Plus } from "lucide-react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { SettingsInsightPanel } from "@/components/settings/context/SettingsInsightPanel";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { ShiftsTable, ShiftWizard } from "@/components/settings/shifts";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useAllShifts } from "@/hooks/useShifts";
import { useUserContext } from "@/contexts/UserContext";
import { timeToMinutes } from "@/lib/shiftValidation";
import { ALL_WEEKDAYS, DAY_LABELS } from "@/types/shifts";
import { useState } from "react";

export default function SettingsReserveringenShifts() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const { data: allShifts = [] } = useAllShifts(locationId);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Calculate insights
  const insights = useMemo(() => {
    const activeShifts = allShifts.filter((s) => s.is_active);
    const archivedCount = allShifts.filter((s) => !s.is_active).length;

    // Days with shifts
    const daysWithShifts = new Set<number>();
    activeShifts.forEach((s) => s.days_of_week.forEach((d) => daysWithShifts.add(d)));

    // Total hours per week
    let totalMinutes = 0;
    activeShifts.forEach((s) => {
      const duration = timeToMinutes(s.end_time) - timeToMinutes(s.start_time);
      totalMinutes += duration * s.days_of_week.length;
    });
    const totalHours = Math.round(totalMinutes / 60);

    return [
      { label: "Actieve shifts", value: activeShifts.length.toString() },
      { label: "Dagen met shifts", value: `${daysWithShifts.size}/7` },
      { label: "Totaal uren/week", value: totalHours.toString(), unit: "uur" },
      ...(archivedCount > 0
        ? [{ label: "Gearchiveerd", value: archivedCount.toString() }]
        : []),
    ];
  }, [allShifts]);

  // Health checks
  const checks = useMemo(() => {
    const activeShifts = allShifts.filter((s) => s.is_active);
    const result: Array<{ status: "ok" | "warning" | "error"; message: string }> = [];

    if (activeShifts.length === 0) {
      result.push({ status: "error", message: "Geen actieve shifts" });
    } else {
      result.push({ status: "ok", message: `${activeShifts.length} actieve shifts` });
    }

    // Check for days without shifts
    const daysWithShifts = new Set<number>();
    activeShifts.forEach((s) => s.days_of_week.forEach((d) => daysWithShifts.add(d)));
    const daysWithoutShifts = ALL_WEEKDAYS.filter((d) => !daysWithShifts.has(d));

    if (daysWithoutShifts.length > 0 && daysWithoutShifts.length < 7) {
      const dayNames = daysWithoutShifts.map((d) => DAY_LABELS[d]).join(", ");
      result.push({ status: "warning", message: `Geen shifts op ${dayNames}` });
    }

    return result;
  }, [allShifts]);

  // Context - Exceptions placeholder
  const context = [
    "Shift exceptions beheer coming soon",
    "Configureer afwijkende dagen zoals feestdagen",
  ];

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
      aside={<SettingsInsightPanel insights={insights} checks={checks} context={context} />}
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
