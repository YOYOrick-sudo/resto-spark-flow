import { useMemo } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { LocationSettingsCard } from "@/components/settings/tables";
import { SettingsInsightPanel, InsightItem, HealthCheck } from "@/components/settings/context";
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

    // Risk: precies 1, hoogste prioriteit issue
    let riskCheck: HealthCheck | null = null;
    
    if (settings.default_buffer_minutes === 0) {
      riskCheck = { status: "warning", message: "Geen buffer. Risico op overlap." };
    } else if (settings.booking_cutoff_minutes < 30) {
      riskCheck = { status: "warning", message: "Korte cutoff (<30 min)." };
    } else if (settings.default_duration_minutes > 180) {
      riskCheck = { status: "warning", message: "Lange reserveringsduur (>3 uur)." };
    } else if (!settings.auto_assign) {
      riskCheck = { status: "warning", message: "Auto-assign uit." };
    }

    // OK: alleen als basisconfig ok (geen riskCheck)
    const okCheck: HealthCheck | null = !riskCheck
      ? { status: "ok", message: "Basisconfig in orde." }
      : null;

    return [okCheck, riskCheck].filter(Boolean) as HealthCheck[];
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
          <SettingsInsightPanel insights={insights} checks={checks} context={context} />
        ) : undefined
      }
    >
      <div className="max-w-2xl">
        <LocationSettingsCard locationId={currentLocation?.id} />
      </div>
    </SettingsDetailLayout>
  );
}
