import { useState } from "react";
import { PageHeader } from "@/components/polar/PageHeader";
import { FormSection } from "@/components/polar/FormSection";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { toast } from "sonner";
import { mockPacingSettings, updatePacingSettings } from "@/data/reservations";

export default function SettingsReserveringen() {
  const [settings, setSettings] = useState({
    defaultLimitPerQuarter: mockPacingSettings.defaultLimitPerQuarter,
    lunchLimit: mockPacingSettings.shiftOverrides?.lunch || mockPacingSettings.defaultLimitPerQuarter,
    dinnerLimit: mockPacingSettings.shiftOverrides?.dinner || mockPacingSettings.defaultLimitPerQuarter,
    lunchStart: mockPacingSettings.shiftTimes?.lunch?.start || "11:00",
    lunchEnd: mockPacingSettings.shiftTimes?.lunch?.end || "15:00",
    dinnerStart: mockPacingSettings.shiftTimes?.dinner?.start || "17:00",
    dinnerEnd: mockPacingSettings.shiftTimes?.dinner?.end || "23:00",
  });

  const handleSave = () => {
    updatePacingSettings({
      defaultLimitPerQuarter: settings.defaultLimitPerQuarter,
      shiftOverrides: {
        lunch: settings.lunchLimit,
        dinner: settings.dinnerLimit,
      },
      shiftTimes: {
        lunch: { start: settings.lunchStart, end: settings.lunchEnd },
        dinner: { start: settings.dinnerStart, end: settings.dinnerEnd },
      },
    });
    toast.success("Pacing instellingen opgeslagen");
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return { value: `${hour}:00`, label: `${hour}:00` };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reserveringen"
        description="Beheer pacing limits en reserveringsinstellingen"
        actions={
          <NestoButton onClick={handleSave}>Opslaan</NestoButton>
        }
      />

      <div className="max-w-2xl space-y-6">
        <FormSection
          title="Pacing Limits"
          description="Stel in hoeveel gasten je per kwartier wilt ontvangen. Deze limits bepalen de kleurindicatie in de Grid View."
        >
          <div className="space-y-4">
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
            
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium mb-3">Shift Overrides (optioneel)</p>
              <p className="text-xs text-muted-foreground mb-4">
                Stel afwijkende limits in voor lunch en diner shifts.
              </p>
              
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
          </div>
        </FormSection>

        <FormSection
          title="Shift Tijden"
          description="Definieer wanneer lunch en diner shifts beginnen en eindigen."
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Lunch</p>
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
            </div>
            
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Diner</p>
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
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Kleur Legenda"
          description="Zo worden de kleuren weergegeven in de Grid View."
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded bg-success" />
              <span className="text-muted-foreground">0-70% bezet — Ruimte beschikbaar</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded bg-warning" />
              <span className="text-muted-foreground">71-100% bezet — Bijna vol</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded bg-destructive" />
              <span className="text-muted-foreground">100%+ bezet — Over pacing limit</span>
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}
