import { NestoInput } from "@/components/polar/NestoInput";
import { FieldHelp } from "@/components/polar/FieldHelp";
import { SectionHeader } from "./SectionHeader";
import type { ShiftTicketOverrides } from "../../ShiftWizardContext";
import type { TicketWithMeta } from "@/hooks/useTickets";

interface BasisTabProps {
  ticket: TicketWithMeta;
  overrides: ShiftTicketOverrides | undefined;
  onSetOverride: (field: keyof ShiftTicketOverrides, value: any) => void;
}

export function BasisTab({ ticket, overrides, onSetOverride }: BasisTabProps) {
  const handleNumberInput = (field: keyof ShiftTicketOverrides, value: string) => {
    const parsed = value === "" ? null : parseInt(value, 10);
    onSetOverride(field, isNaN(parsed as number) ? null : parsed);
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Duration & Buffer */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <SectionHeader label="Tafeltijd & buffer">
          <FieldHelp>
            <p>Duur bepaalt hoe lang een tafel bezet is. Buffer is de opruimtijd tussen reserveringen.</p>
          </FieldHelp>
        </SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <NestoInput
            type="number"
            placeholder={String(ticket.duration_minutes)}
            value={overrides?.overrideDuration ?? ""}
            onChange={(e) => handleNumberInput("overrideDuration", e.target.value)}
            label="Duur (min)"
          />
          <NestoInput
            type="number"
            placeholder={String(ticket.buffer_minutes)}
            value={overrides?.overrideBuffer ?? ""}
            onChange={(e) => handleNumberInput("overrideBuffer", e.target.value)}
            label="Buffer (min)"
          />
        </div>
      </div>

      {/* Party Size */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <SectionHeader label="Groepsgrootte">
          <FieldHelp>
            <p>Beperk het aantal gasten per reservering voor dit ticket in deze shift. Leeg = standaard van het ticket.</p>
          </FieldHelp>
        </SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <NestoInput
            type="number"
            placeholder={String(ticket.min_party_size)}
            value={overrides?.overrideMinParty ?? ""}
            onChange={(e) => handleNumberInput("overrideMinParty", e.target.value)}
            label="Minimum"
          />
          <NestoInput
            type="number"
            placeholder={String(ticket.max_party_size)}
            value={overrides?.overrideMaxParty ?? ""}
            onChange={(e) => handleNumberInput("overrideMaxParty", e.target.value)}
            label="Maximum"
          />
        </div>
      </div>
    </div>
  );
}
