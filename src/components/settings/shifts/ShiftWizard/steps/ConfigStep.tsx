import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FieldHelp } from "@/components/polar/FieldHelp";
import { useShiftWizard, type ShiftTicketOverrides } from "../ShiftWizardContext";
import { useTickets, type TicketWithMeta } from "@/hooks/useTickets";
import { useAreasWithTables } from "@/hooks/useAreasWithTables";
import type { AreaWithTables } from "@/types/reservations";

function countOverrides(o: ShiftTicketOverrides | undefined): number {
  if (!o) return 0;
  let count = 0;
  if (o.overrideDuration !== null) count++;
  if (o.overrideBuffer !== null) count++;
  if (o.overrideMinParty !== null) count++;
  if (o.overrideMaxParty !== null) count++;
  if (o.pacingLimit !== null) count++;
  if (o.seatingLimitGuests !== null) count++;
  if (o.seatingLimitReservations !== null) count++;
  if (o.ignorePacing) count++;
  if (o.areas !== null) count++;
  if (o.showAreaName) count++;
  if (o.squeezeEnabled) count++;
  if (o.showEndTime) count++;
  if (o.waitlistEnabled) count++;
  return count;
}

/** Section header with optional FieldHelp tooltip */
function SectionHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

interface TicketConfigPanelProps {
  ticket: TicketWithMeta;
  overrides: ShiftTicketOverrides | undefined;
  areas: AreaWithTables[];
  defaultOpen: boolean;
  onSetOverride: (field: keyof ShiftTicketOverrides, value: any) => void;
}

function TicketConfigPanel({ ticket, overrides, areas, defaultOpen, onSetOverride }: TicketConfigPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const overrideCount = countOverrides(overrides);
  const useSpecificAreas = overrides?.areas !== null && overrides?.areas !== undefined;
  const selectedAreas = overrides?.areas ?? [];

  const handleNumberInput = (field: keyof ShiftTicketOverrides, value: string) => {
    const parsed = value === "" ? null : parseInt(value, 10);
    onSetOverride(field, isNaN(parsed as number) ? null : parsed);
  };

  const toggleArea = (areaId: string) => {
    const current = overrides?.areas ?? [];
    const next = current.includes(areaId)
      ? current.filter((id) => id !== areaId)
      : [...current, areaId];
    onSetOverride("areas", next.length > 0 ? next : []);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-dropdown border border-border transition-all text-left",
            open
              ? "bg-secondary/40 border-l-2 border-l-primary"
              : "bg-secondary/20 hover:bg-secondary/40"
          )}
        >
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ticket.color }} />
          <span className="text-sm font-medium flex-1">{ticket.display_title}</span>
          {overrideCount > 0 && (
            <NestoBadge variant="outline" className="text-xs">
              {overrideCount} override{overrideCount !== 1 ? "s" : ""}
            </NestoBadge>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-border rounded-b-dropdown p-4 space-y-4">
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

          {/* Pacing */}
          <div className="bg-secondary/50 rounded-card p-4 space-y-3">
            <SectionHeader label="Pacing">
              <FieldHelp>
                <p>Pacing beperkt hoeveel gasten tegelijk kunnen arriveren per tijdslot. Dit voorkomt piekdrukte in de keuken.</p>
              </FieldHelp>
            </SectionHeader>
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
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ConfigStep() {
  const { selectedTickets, ticketOverrides, setTicketOverride, locationId } = useShiftWizard();
  const { data: ticketData } = useTickets(locationId);
  const { data: areas = [] } = useAreasWithTables(locationId);

  const activeTickets = (ticketData?.visibleTickets ?? []).filter(
    (t) => t.status === "active" && selectedTickets.includes(t.id)
  );

  if (selectedTickets.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Configuratie per ticket</h3>
        <p className="text-sm text-muted-foreground">
          Selecteer eerst tickets in de vorige stap.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Configuratie per ticket</h3>
      <p className="text-xs text-muted-foreground">
        Laat velden leeg om de standaardwaarden van het ticket te gebruiken.
      </p>

      <div className="space-y-2">
        {activeTickets.map((ticket, index) => (
          <TicketConfigPanel
            key={ticket.id}
            ticket={ticket}
            overrides={ticketOverrides[ticket.id]}
            areas={areas}
            defaultOpen={index === 0}
            onSetOverride={(field, value) => setTicketOverride(ticket.id, field, value)}
          />
        ))}
      </div>
    </div>
  );
}
