import { useState } from "react";
import { SettingsPageLayout } from "@/components/polar/SettingsPageLayout";
import { FormSection } from "@/components/polar/FormSection";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { toast } from "sonner";
import { mockPacingSettings, updatePacingSettings } from "@/data/reservations";
import { LocationSettingsCard, AreasSection, TableGroupsSection } from "@/components/settings/tables";
import { useUserContext } from "@/contexts/UserContext";

const sections = [
  { id: "pacing", label: "Pacing" },
  { id: "tafels", label: "Tafelbeheer" },
  { id: "shifts", label: "Shift Tijden" },
  { id: "notificaties", label: "Notificaties" },
];

export default function SettingsReserveringen() {
  const { currentLocation } = useUserContext();
  const [activeSection, setActiveSection] = useState("pacing");
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
    <SettingsPageLayout
      module="Reserveringen"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "pacing" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pacing Limits</h2>
              <p className="text-sm text-muted-foreground">
                Stel in hoeveel gasten je per kwartier wilt ontvangen.
              </p>
            </div>
            <NestoButton onClick={handleSave}>Opslaan</NestoButton>
          </div>

          <div className="max-w-2xl space-y-6">
            <FormSection
              title="Standaard Pacing"
              description="Deze limits bepalen de kleurindicatie in de Grid View."
            >
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
            </FormSection>

            <FormSection
              title="Shift Overrides"
              description="Stel afwijkende limits in voor lunch en diner shifts."
            >
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
      )}

      {activeSection === "tafels" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tafelbeheer</h2>
              <p className="text-sm text-muted-foreground">
                Beheer areas, tafels en tafelcombinaties.
              </p>
            </div>
          </div>

          <div className="max-w-4xl space-y-6">
            <LocationSettingsCard locationId={currentLocation?.id} />
            <AreasSection locationId={currentLocation?.id} />
            <TableGroupsSection locationId={currentLocation?.id} />
          </div>
        </div>
      )}

      {activeSection === "shifts" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Shift Tijden</h2>
            <p className="text-sm text-muted-foreground">
              Definieer wanneer lunch en diner shifts beginnen en eindigen.
            </p>
          </div>

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
        </div>
      )}

      {activeSection === "notificaties" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Notificaties</h2>
          <p className="text-sm text-muted-foreground">
            Configureer e-mail en push notificaties voor reserveringen.
          </p>
          <div className="nesto-card-base p-6">
            <p className="text-muted-foreground">Notificatie instellingen komen hier.</p>
          </div>
        </div>
      )}
    </SettingsPageLayout>
  );
}
