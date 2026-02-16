import { useState, useMemo } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { FormSection } from "@/components/polar/FormSection";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
import { SettingsInsightPanel, InsightItem, HealthCheck } from "@/components/settings/context";
import { TitleHelp } from "@/components/polar/TitleHelp";
import { nestoToast } from "@/lib/nestoToast";
import { mockPacingSettings, updatePacingSettings } from "@/data/pacingMockData";
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
    nestoToast.success("Shift tijden opgeslagen");
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
    // Risk: prioriteit error > warning > null
    let riskCheck: HealthCheck | null = null;
    
    if (gap < 0) {
      riskCheck = { status: "error", message: "Shifts overlappen." };
    } else if (gap === 0) {
      riskCheck = { status: "warning", message: "Geen gap tussen shifts." };
    } else if (lunchDuration < 2 && lunchDuration > 0) {
      riskCheck = { status: "warning", message: "Korte lunch shift (<2 uur)." };
    } else if (dinnerDuration > 8) {
      riskCheck = { status: "warning", message: "Lange diner shift (>8 uur)." };
    }

    // OK: alleen als geen risk
    const okCheck: HealthCheck | null = !riskCheck
      ? { status: "ok", message: "Geen overlap tussen shifts." }
      : null;

    return [okCheck, riskCheck].filter(Boolean) as HealthCheck[];
  }, [gap, lunchDuration, dinnerDuration]);

  const context = useMemo(() => {
    const result: string[] = [];
    if (gap > 0) {
      result.push(`${gap} uur gap tussen lunch en diner.`);
    }
    result.push(`Openingstijd: ${settings.lunchStart} – ${settings.dinnerEnd}.`);
    return result;
  }, [gap, settings.lunchStart, settings.dinnerEnd]);

  return (
    <SettingsDetailLayout
      title={
        <span className="flex items-center gap-2">
          Shift Tijden
          <TitleHelp title="Shift Tijden">
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Wanneer lunch en diner boekbaar zijn.</li>
              <li>Overlap en gaten beïnvloeden pacing en bezetting.</li>
              <li>Shifts bepalen welke regels per moment gelden.</li>
            </ul>
          </TitleHelp>
        </span>
      }
      description="Definieer wanneer lunch en diner shifts beginnen en eindigen."
      breadcrumbs={breadcrumbs}
      actions={<NestoButton onClick={handleSave}>Opslaan</NestoButton>}
      aside={<SettingsInsightPanel insights={insights} checks={checks} context={context} />}
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
