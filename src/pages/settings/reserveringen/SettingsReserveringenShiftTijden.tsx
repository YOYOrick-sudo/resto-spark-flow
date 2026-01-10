import { useState, useMemo } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { FormSection } from "@/components/polar/FormSection";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
import { SettingsContextPanel, InsightItem, HealthCheck } from "@/components/settings/context";
import { toast } from "sonner";
import { mockPacingSettings, updatePacingSettings } from "@/data/reservations";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Shift times settings page
 */
export default function SettingsReserveringenShiftTijden() {
  const [settings, setSettings] = useState({
    lunchStart: mockPacingSettings.shiftTimes?.lunch?.start || "11:00",
    lunchEnd: mockPacingSettings.shiftTimes?.lunch?.end || "15:00",
    dinnerStart: mockPacingSettings.shiftTimes?.dinner?.start || "17:00",
    dinnerEnd: mockPacingSettings.shiftTimes?.dinner?.end || "23:00",
  });

  const handleSave = () => {
    updatePacingSettings({
      shiftTimes: {
        lunch: { start: settings.lunchStart, end: settings.lunchEnd },
        dinner: { start: settings.dinnerStart, end: settings.dinnerEnd },
      },
    });
    toast.success("Shift tijden opgeslagen");
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return { value: `${hour}:00`, label: `${hour}:00` };
  });

  const breadcrumbs = buildBreadcrumbs("reserveringen", "shift-tijden");

  // Calculate shift durations and gap
  const { lunchDuration, dinnerDuration, gap, totalHours } = useMemo(() => {
    const parseHour = (time: string) => parseInt(time.split(":")[0], 10);
    const lunchStart = parseHour(settings.lunchStart);
    const lunchEnd = parseHour(settings.lunchEnd);
    const dinnerStart = parseHour(settings.dinnerStart);
    const dinnerEnd = parseHour(settings.dinnerEnd);

    return {
      lunchDuration: lunchEnd - lunchStart,
      dinnerDuration: dinnerEnd - dinnerStart,
      gap: dinnerStart - lunchEnd,
      totalHours: dinnerEnd - lunchStart,
    };
  }, [settings]);

  // Build context panel data
  const insights: InsightItem[] = [
    { label: "Lunch duur", value: `${lunchDuration}`, unit: "uur" },
    { label: "Diner duur", value: `${dinnerDuration}`, unit: "uur" },
    { label: "Totale openingstijd", value: `${totalHours}`, unit: "uur" },
    { label: "Gap tussen shifts", value: `${gap}`, unit: "uur" },
  ];

  const checks: HealthCheck[] = useMemo(() => {
    const result: HealthCheck[] = [];

    if (gap < 0) {
      result.push({
        status: "error",
        message: "Shifts overlappen! Dit kan dubbele boekingen veroorzaken.",
      });
    } else if (gap === 0) {
      result.push({
        status: "warning",
        message: "Geen gap tussen lunch en diner. Weinig reset-tijd voor personeel.",
      });
    } else {
      result.push({
        status: "ok",
        message: "Geen overlap tussen shifts.",
      });
    }

    if (lunchDuration < 2 && lunchDuration > 0) {
      result.push({
        status: "warning",
        message: "Zeer korte lunch shift (<2 uur). Check of dit klopt.",
      });
    }

    if (dinnerDuration > 8) {
      result.push({
        status: "warning",
        message: "Zeer lange diner shift (>8 uur). Check of dit klopt.",
      });
    }

    return result;
  }, [gap, lunchDuration, dinnerDuration]);

  const examples = useMemo(() => {
    const result: string[] = [];
    if (gap > 0) {
      result.push(`Met ${gap} uur gap heb je tijd voor cleaning en mise en place.`);
    }
    result.push("Pacing limits worden automatisch toegepast per shift tijdvenster.");
    return result;
  }, [gap]);

  return (
    <SettingsDetailLayout
      title="Shift Tijden"
      description="Definieer wanneer lunch en diner shifts beginnen en eindigen."
      breadcrumbs={breadcrumbs}
      actions={<NestoButton onClick={handleSave}>Opslaan</NestoButton>}
      aside={<SettingsContextPanel insights={insights} checks={checks} examples={examples} />}
    >
      <div className="max-w-2xl space-y-6">
        <FormSection title="Lunch">
          <div className="grid grid-cols-2 gap-4">
            <NestoSelect
              label="Start"
              value={settings.lunchStart}
              onValueChange={(value) => setSettings({ ...settings, lunchStart: value })}
              options={timeOptions}
            />
            <NestoSelect
              label="Eind"
              value={settings.lunchEnd}
              onValueChange={(value) => setSettings({ ...settings, lunchEnd: value })}
              options={timeOptions}
            />
          </div>
        </FormSection>

        <FormSection title="Diner">
          <div className="grid grid-cols-2 gap-4">
            <NestoSelect
              label="Start"
              value={settings.dinnerStart}
              onValueChange={(value) => setSettings({ ...settings, dinnerStart: value })}
              options={timeOptions}
            />
            <NestoSelect
              label="Eind"
              value={settings.dinnerEnd}
              onValueChange={(value) => setSettings({ ...settings, dinnerEnd: value })}
              options={timeOptions}
            />
          </div>
        </FormSection>
      </div>
    </SettingsDetailLayout>
  );
}
