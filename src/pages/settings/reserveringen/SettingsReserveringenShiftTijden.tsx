import { useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { FormSection } from "@/components/polar/FormSection";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
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

  return (
    <SettingsDetailLayout
      title="Shift Tijden"
      description="Definieer wanneer lunch en diner shifts beginnen en eindigen."
      breadcrumbs={breadcrumbs}
      actions={<NestoButton onClick={handleSave}>Opslaan</NestoButton>}
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
