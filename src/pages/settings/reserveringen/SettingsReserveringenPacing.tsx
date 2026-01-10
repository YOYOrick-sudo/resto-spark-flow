import { useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import {
  SettingsContextPanel,
  InsightItem,
  HealthCheck,
} from "@/components/settings/context";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
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

  const insights: InsightItem[] = [
    { label: "Zitcapaciteit", value: String(seatCapacity), unit: "stoelen" },
    { label: "Max instroom/uur", value: String(maxHourly), unit: "gasten" },
    { label: "Turns/uur", value: `${turnsPerHour.toFixed(1)}×` },
    { label: "Lunch instroom/uur", value: String(hourlyLunch), unit: "gasten" },
    { label: "Diner instroom/uur", value: String(hourlyDinner), unit: "gasten" },
  ];

  const checks: HealthCheck[] = [];

  const hasShiftOverrides =
    settings.lunchLimit !== settings.defaultLimitPerQuarter ||
    settings.dinnerLimit !== settings.defaultLimitPerQuarter;

  checks.push({
    status: hasShiftOverrides ? "ok" : "warning",
    message: hasShiftOverrides
      ? "Shift-specifieke pacing actief."
      : "Geen shift-differentiatie. Vaak suboptimaal als lunch en diner andere flow hebben.",
  });

  if (turnsPerHour >= 2.0) {
    checks.push({
      status: "error",
      message: `${turnsPerHour.toFixed(1)}× turns/uur is te agressief voor de meeste horeca flows.`,
    });
  } else if (turnsPerHour >= 1.5) {
    checks.push({
      status: "warning",
      message: `${turnsPerHour.toFixed(1)}× turns/uur vraagt strakke keuken en korte verblijftijd.`,
    });
  } else if (maxHourly > seatCapacity) {
    checks.push({
      status: "warning",
      message: `Instroom (${maxHourly}/uur) hoger dan zitcapaciteit (${seatCapacity}). Alleen haalbaar bij snelle doorloop.`,
    });
  }

  const examples: string[] = [];

  if (turnsPerHour < 1.0) {
    examples.push(
      "Je pacing is lager dan zitcapaciteit. Dit is rustig en safe, maar mogelijk onderbenutte capaciteit."
    );
  } else if (turnsPerHour < 1.5) {
    examples.push(
      "Dit vraagt normale doorloop en goede timing. Standaard voor veel restaurants."
    );
  } else {
    examples.push(
      "Dit vraagt snelle doorloop, strakke keuken en voldoende buffers tussen reserveringen."
    );
  }

  examples.push(
    `Met diner pacing op ${settings.dinnerLimit}/kwartier stromen er ${hourlyDinner} gasten/uur binnen bij ${seatCapacity} stoelen.`
  );

  examples.push(
    "Walk-ins volgen deze limieten niet. Gebruik pacing vooral om online instroom te sturen."
  );

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
      title="Pacing Limits"
      description="Stel in hoeveel gasten je per kwartier wilt ontvangen."
      breadcrumbs={breadcrumbs}
      actions={<NestoButton onClick={handleSave}>Opslaan</NestoButton>}
      aside={
        <SettingsContextPanel
          insights={insights}
          checks={checks}
          examples={examples}
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
