import { useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { toast } from "sonner";
import { mockPacingSettings, updatePacingSettings } from "@/data/reservations";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

/**
 * Niveau 4: Pacing settings page
 */
export default function SettingsReserveringenPacing() {
  const [settings, setSettings] = useState({
    defaultLimitPerQuarter: mockPacingSettings.defaultLimitPerQuarter,
    lunchLimit: mockPacingSettings.shiftOverrides?.lunch || mockPacingSettings.defaultLimitPerQuarter,
    dinnerLimit: mockPacingSettings.shiftOverrides?.dinner || mockPacingSettings.defaultLimitPerQuarter,
  });

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
      backTo="/instellingen/reserveringen"
      backLabel="Reserveringen"
      breadcrumbs={breadcrumbs}
      actions={<NestoButton onClick={handleSave}>Opslaan</NestoButton>}
    >
      <div className="max-w-2xl">
        <NestoCard className="p-6">
          {/* Sectie 1: Standaard Pacing */}
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
                setSettings({ ...settings, defaultLimitPerQuarter: parseInt(e.target.value) || 1 })
              }
            />
          </div>

          {/* Divider */}
          <div className="border-t my-6" />

          {/* Sectie 2: Shift Overrides */}
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
                  setSettings({ ...settings, lunchLimit: parseInt(e.target.value) || 1 })
                }
              />
              <NestoInput
                label="Diner pacing"
                type="number"
                min={1}
                max={100}
                value={settings.dinnerLimit}
                onChange={(e) =>
                  setSettings({ ...settings, dinnerLimit: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t my-6" />

          {/* Sectie 3: Kleur Legenda (informatief) */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Kleur Legenda</h4>
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
