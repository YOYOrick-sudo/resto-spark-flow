import { NestoInput } from "@/components/polar/NestoInput";
import { FieldHelp } from "@/components/polar/FieldHelp";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SectionHeader } from "./SectionHeader";
import type { ShiftTicketOverrides } from "../../ShiftWizardContext";
import type { TicketWithMeta } from "@/hooks/useTickets";
import type { AreaWithTables } from "@/types/reservations";
import type { ArrivalInterval } from "@/types/shifts";

interface CapaciteitTabProps {
  ticket: TicketWithMeta;
  overrides: ShiftTicketOverrides | undefined;
  areas: AreaWithTables[];
  arrivalInterval: ArrivalInterval;
  onSetOverride: (field: keyof ShiftTicketOverrides, value: any) => void;
}

export function CapaciteitTab({ ticket, overrides, areas, arrivalInterval, onSetOverride }: CapaciteitTabProps) {
  const handleNumberInput = (field: keyof ShiftTicketOverrides, value: string) => {
    const parsed = value === "" ? null : parseInt(value, 10);
    onSetOverride(field, isNaN(parsed as number) ? null : parsed);
  };

  const useSpecificAreas = overrides?.areas !== null && overrides?.areas !== undefined;
  const selectedAreas = overrides?.areas ?? [];

  const toggleArea = (areaId: string) => {
    const current = overrides?.areas ?? [];
    const next = current.includes(areaId)
      ? current.filter((id) => id !== areaId)
      : [...current, areaId];
    onSetOverride("areas", next.length > 0 ? next : []);
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Pacing */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <SectionHeader label="Pacing">
          <FieldHelp>
            <p>Pacing beperkt hoeveel gasten tegelijk kunnen arriveren per tijdslot. Dit voorkomt piekdrukte in de keuken.</p>
          </FieldHelp>
        </SectionHeader>
        <p className="text-xs text-muted-foreground">Per slot van {arrivalInterval} minuten</p>
        <div className="grid grid-cols-2 gap-3">
          <NestoInput
            type="number"
            placeholder="Geen limiet"
            value={overrides?.pacingLimit ?? ""}
            onChange={(e) => handleNumberInput("pacingLimit", e.target.value)}
            label="Max gasten/slot"
          />
          <div className="flex items-end pb-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={overrides?.ignorePacing ?? false}
                onCheckedChange={(v) => onSetOverride("ignorePacing", v)}
              />
              <Label className="text-sm">Negeer pacing</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Seating Limits */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <SectionHeader label="Seating limieten">
          <FieldHelp>
            <p>Beperk het totaal aantal gasten of reserveringen dat tegelijk in de shift kan zitten.</p>
          </FieldHelp>
        </SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <NestoInput
            type="number"
            placeholder="Geen limiet"
            value={overrides?.seatingLimitGuests ?? ""}
            onChange={(e) => handleNumberInput("seatingLimitGuests", e.target.value)}
            label="Max gasten"
          />
          <NestoInput
            type="number"
            placeholder="Geen limiet"
            value={overrides?.seatingLimitReservations ?? ""}
            onChange={(e) => handleNumberInput("seatingLimitReservations", e.target.value)}
            label="Max reserveringen"
          />
        </div>
      </div>

      {/* Areas */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <SectionHeader label="Gebieden">
          <FieldHelp>
            <p>Kies in welke gebieden dit ticket beschikbaar is. Standaard: alle gebieden.</p>
          </FieldHelp>
        </SectionHeader>
        <RadioGroup
          value={useSpecificAreas ? "specific" : "all"}
          onValueChange={(v) => onSetOverride("areas", v === "all" ? null : [])}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="all" id={`areas-all-${ticket.id}`} />
            <Label htmlFor={`areas-all-${ticket.id}`} className="text-sm cursor-pointer">
              Alle gebieden ({areas.length})
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="specific" id={`areas-specific-${ticket.id}`} />
            <Label htmlFor={`areas-specific-${ticket.id}`} className="text-sm cursor-pointer">
              Specifieke gebieden
            </Label>
          </div>
        </RadioGroup>
        {useSpecificAreas && (
          <div className="pl-6 space-y-1.5">
            {areas.map((area) => {
              const tableCount = area.tables.length;
              const seatCount = area.tables.reduce((sum, t) => sum + t.max_capacity, 0);
              return (
                <label key={area.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedAreas.includes(area.id)}
                    onCheckedChange={() => toggleArea(area.id)}
                  />
                  <span className="text-sm">{area.name}</span>
                  <span className="text-xs text-muted-foreground">({tableCount}t, {seatCount}s)</span>
                </label>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Switch
            checked={overrides?.showAreaName ?? false}
            onCheckedChange={(v) => onSetOverride("showAreaName", v)}
          />
          <Label className="text-sm">Toon area naam in widget</Label>
        </div>
      </div>
    </div>
  );
}
