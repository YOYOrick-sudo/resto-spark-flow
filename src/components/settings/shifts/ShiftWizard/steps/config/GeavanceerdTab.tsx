import { NestoInput } from "@/components/polar/NestoInput";
import { FieldHelp } from "@/components/polar/FieldHelp";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "./SectionHeader";
import type { ShiftTicketOverrides } from "../../ShiftWizardContext";

interface GeavanceerdTabProps {
  overrides: ShiftTicketOverrides | undefined;
  onSetOverride: (field: keyof ShiftTicketOverrides, value: any) => void;
}

export function GeavanceerdTab({ overrides, onSetOverride }: GeavanceerdTabProps) {
  const handleNumberInput = (field: keyof ShiftTicketOverrides, value: string) => {
    const parsed = value === "" ? null : parseInt(value, 10);
    onSetOverride(field, isNaN(parsed as number) ? null : parsed);
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Squeeze */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <SectionHeader label="Squeeze">
          <FieldHelp>
            <p>Squeeze verkort de verblijfsduur bij hoge bezetting, zodat je extra reserveringen kunt plaatsen.</p>
          </FieldHelp>
        </SectionHeader>
        <div className="flex items-center gap-2">
          <Switch
            checked={overrides?.squeezeEnabled ?? false}
            onCheckedChange={(v) => onSetOverride("squeezeEnabled", v)}
          />
          <Label className="text-sm">Squeeze inschakelen</Label>
        </div>
        {overrides?.squeezeEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <NestoInput
              type="number"
              placeholder="Geen"
              value={overrides?.squeezeDuration ?? ""}
              onChange={(e) => handleNumberInput("squeezeDuration", e.target.value)}
              label="Duur (min)"
            />
            <NestoInput
              type="number"
              placeholder="Geen"
              value={overrides?.squeezeGap ?? ""}
              onChange={(e) => handleNumberInput("squeezeGap", e.target.value)}
              label="Gap (min)"
            />
            <NestoInput
              type="time"
              placeholder="Geen"
              value={overrides?.squeezeFixedEndTime ?? ""}
              onChange={(e) => onSetOverride("squeezeFixedEndTime", e.target.value || null)}
              label="Vaste eindtijd"
            />
            <NestoInput
              type="number"
              placeholder="Geen"
              value={overrides?.squeezeLimit ?? ""}
              onChange={(e) => handleNumberInput("squeezeLimit", e.target.value)}
              label="Max per shift"
            />
          </div>
        )}
      </div>

      {/* Display */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <SectionHeader label="Weergave">
          <FieldHelp>
            <p>Bepaal welke informatie gasten zien in de boekingswidget.</p>
          </FieldHelp>
        </SectionHeader>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={overrides?.showEndTime ?? false}
              onCheckedChange={(v) => onSetOverride("showEndTime", v)}
            />
            <Label className="text-sm">Toon eindtijd</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={overrides?.waitlistEnabled ?? false}
              onCheckedChange={(v) => onSetOverride("waitlistEnabled", v)}
            />
            <Label className="text-sm">Wachtlijst</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
