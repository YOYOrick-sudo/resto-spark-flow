import { useMemo } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { LocationSettingsCard } from "@/components/settings/tables";
import { SettingsContextPanel, InsightItem, HealthCheck } from "@/components/settings/context";
import { useUserContext } from "@/contexts/UserContext";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Location settings page
 */
export default function SettingsReserveringenTafelsLocatie() {
  const { currentLocation } = useUserContext();
  const { data: settings, isLoading } = useReservationSettings(currentLocation?.id);
  const breadcrumbs = buildBreadcrumbs("reserveringen", "tafels", "locatie");

  // Build context panel data
  const insights: InsightItem[] = useMemo(() => {
    if (!settings) return [];
    const duration = settings.default_duration_minutes;
    const buffer = settings.default_buffer_minutes;
    const cutoff = settings.booking_cutoff_minutes;
    const effectiveSlot = duration + buffer;

    return [
      { label: "Standaard duur", value: `${duration}`, unit: "min" },
      { label: "Buffer", value: `${buffer}`, unit: "min" },
      { label: "Cutoff", value: `${cutoff}`, unit: "min" },
      { label: "Effectieve slot", value: `${effectiveSlot}`, unit: "min" },
    ];
  }, [settings]);

  const checks: HealthCheck[] = useMemo(() => {
    if (!settings) return [];
    const result: HealthCheck[] = [];

    // Auto-assign check
    if (settings.auto_assign) {
      result.push({
        status: "ok",
        message: "Auto-assign actief. Tafels worden automatisch toegewezen.",
      });
    } else {
      result.push({
        status: "warning",
        message: "Auto-assign uit. Handmatige toewijzing vereist bij elke reservering.",
      });
    }

    // Multi-table check
    if (settings.allow_multi_table) {
      result.push({
        status: "ok",
        message: "Multi-tafel boekingen toegestaan voor grote groepen.",
      });
    }

    // Buffer check
    if (settings.default_buffer_minutes === 0) {
      result.push({
        status: "warning",
        message: "Geen buffer tussen reserveringen. Risico op overlap bij uitloop.",
      });
    }

    // Cutoff check
    if (settings.booking_cutoff_minutes < 30) {
      result.push({
        status: "warning",
        message: "Zeer korte cutoff (<30 min). Last-minute boekingen mogelijk.",
      });
    }

    // Duration check
    if (settings.default_duration_minutes > 180) {
      result.push({
        status: "warning",
        message: "Zeer lange reserveringsduur (>3 uur). Check of dit standaard moet zijn.",
      });
    }

    return result;
  }, [settings]);

  const context = useMemo(() => {
    if (!settings) return [];
    const duration = settings.default_duration_minutes;
    const buffer = settings.default_buffer_minutes;
    const effectiveSlot = duration + buffer;

    return [
      `Effectieve slot: ${effectiveSlot} min (${duration} + ${buffer}).`,
    ];
  }, [settings]);

  return (
    <SettingsDetailLayout
      title="Locatie-instellingen"
      description="Algemene reserveringsinstellingen voor deze locatie."
      breadcrumbs={breadcrumbs}
      aside={
        !isLoading && settings ? (
          <SettingsContextPanel insights={insights} checks={checks} context={context} />
        ) : undefined
      }
    >
      <div className="max-w-2xl">
        <LocationSettingsCard locationId={currentLocation?.id} />
      </div>
    </SettingsDetailLayout>
  );
}
