import { useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import {
  SettingsInsightPanel,
  InsightItem,
  HealthCheck,
} from "@/components/settings/context";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { TitleHelp, TitleHelpTip } from "@/components/polar/TitleHelp";
import { toast } from "sonner";
import {
  mockPacingSettings,
  updatePacingSettings,
  mockTables,
} from "@/data/reservations";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

export default function SettingsReserveringenPacing() {
  const [settings, setSettings] = useState({
    defaultLimitPerQuarter: mockPacingSettings.defaultLimitPerQuarter,
    lunchLimit:
      mockPacingSettings.shiftOverrides?.lunch ||
      mockPacingSettings.defaultLimitPerQuarter,
    dinnerLimit:
      mockPacingSettings.shiftOverrides?.dinner ||
      mockPacingSettings.defaultLimitPerQuarter,
  });

  const seatCapacity = mockTables
    .filter((t) => t.isActive)
    .reduce((sum, t) => sum + t.maxCapacity, 0);

  const hourlyDefault = settings.defaultLimitPerQuarter * 4;
  const hourlyLunch = settings.lunchLimit * 4;
  const hourlyDinner = settings.dinnerLimit * 4;
  const maxHourly = Math.max(hourlyDefault, hourlyLunch, hourlyDinner);
  const turnsPerHour = seatCapacity > 0 ? maxHourly / seatCapacity : 0;

  // Determine if shifts differ from each other
  const hasShiftOverrides =
    settings.lunchLimit !== settings.defaultLimitPerQuarter ||
    settings.dinnerLimit !== settings.defaultLimitPerQuarter;

  // Operationeel: max 4 regels, geen duplicaten
  const insights: InsightItem[] = [
    { label: "Zitcapaciteit", value: String(seatCapacity), unit: "stoelen" },
    { label: "Max instroom/uur", value: String(maxHourly), unit: "gasten" },
    { label: "Turns/uur", value: `${turnsPerHour.toFixed(1)}×` },
  ];

  // Conditionele 4e regel: alleen als shifts verschillen en een shift afwijkt van max
  if (hourlyLunch !== hourlyDinner) {
    if (hourlyLunch < maxHourly) {
      insights.push({ label: "Lunch instroom/uur", value: String(hourlyLunch), unit: "gasten" });
    } else if (hourlyDinner < maxHourly) {
      insights.push({ label: "Diner instroom/uur", value: String(hourlyDinner), unit: "gasten" });
    }
  }

  // Signalen: hard cap met 2 expliciete variabelen
  const okCheck: HealthCheck | null = hasShiftOverrides
    ? { status: "ok", message: "Shift-specifieke pacing actief." }
    : null;

  let riskCheck: HealthCheck | null = null;
  if (turnsPerHour >= 2.0) {
    riskCheck = {
      status: "error",
      message: `Turns/uur (${turnsPerHour.toFixed(1)}×) boven operationele norm.`,
    };
  } else if (turnsPerHour >= 1.5) {
    riskCheck = {
      status: "warning",
      message: `Turns/uur (${turnsPerHour.toFixed(1)}×) vereist strakke doorloop.`,
    };
  } else if (maxHourly > seatCapacity) {
    riskCheck = {
      status: "warning",
      message: `Instroom (${maxHourly}/uur) boven zitcapaciteit (${seatCapacity}).`,
    };
  }

  const checks = [okCheck, riskCheck].filter(Boolean) as HealthCheck[];

  // Context: max 2 constateringen, geen coaching
  const context: string[] = [
    `Diner: ${hourlyDinner} gasten/uur bij ${seatCapacity} stoelen.`,
  ];

  if (!hasShiftOverrides) {
    context.push(
      `Lunch en diner gebruiken dezelfde pacing (${settings.defaultLimitPerQuarter}/kwartier).`
    );
  }

  const handleSave = () => {
    updatePacingSettings({
      defaultLimitPerQuarter: settings.defaultLimitPerQuarter,
      shiftOverrides: {
        lunch: settings.lunchLimit,
        dinner: settings.dinnerLimit,
      },
    });
    toast.success("Pacing instellingen opgeslagen");
  };

  const breadcrumbs = buildBreadcrumbs("reserveringen", "pacing");

  return (
    <SettingsDetailLayout
      title={
        <span className="flex items-center gap-2">
          Pacing Limits
          <TitleHelp title="Wat is pacing?">
            <p className="text-muted-foreground">
              Beperkt hoeveel gasten per kwartier kunnen reserveren om de keuken niet te overbelasten.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Te hoog → keuken overbelast</li>
              <li>Te laag → gemiste omzet</li>
            </ul>
            <TitleHelpTip>
              Richtlijn: casual dining 0.5-1.0 turns/uur, fine dining 0.3 of lager. Check je waarde in het panel.
            </TitleHelpTip>
          </TitleHelp>
        </span>
      }
      description="Stel in hoeveel gasten je per kwartier wilt ontvangen."
      breadcrumbs={breadcrumbs}
      actions={<NestoButton onClick={handleSave}>Opslaan</NestoButton>}
      aside={
        <SettingsInsightPanel
          insights={insights}
          checks={checks}
          context={context}
        />
      }
    >
      <div className="max-w-2xl">
        <NestoCard className="p-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Standaard Pacing</h3>
              <p className="text-sm text-muted-foreground">
                Deze limits bepalen de kleurindicatie in de Grid View.
              </p>
            </div>
            <NestoInput
              label="Standaard pacing (gasten per 15 min)"
              type="number"
              min={1}
              max={100}
              value={settings.defaultLimitPerQuarter}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultLimitPerQuarter: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>

          <div className="border-t my-6" />

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Shift Overrides</h3>
              <p className="text-sm text-muted-foreground">
                Stel afwijkende limits in voor lunch en diner shifts.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NestoInput
                label="Lunch pacing"
                type="number"
                min={1}
                max={100}
                value={settings.lunchLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lunchLimit: parseInt(e.target.value) || 1,
                  })
                }
              />
              <NestoInput
                label="Diner pacing"
                type="number"
                min={1}
                max={100}
                value={settings.dinnerLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dinnerLimit: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          <div className="border-t my-6" />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Kleur Legenda
            </h4>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-success" />
                <span className="text-muted-foreground">0-70% bezet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-warning" />
                <span className="text-muted-foreground">71-100% bezet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-destructive" />
                <span className="text-muted-foreground">100%+ bezet</span>
              </div>
            </div>
          </div>
        </NestoCard>
      </div>
    </SettingsDetailLayout>
  );
}
