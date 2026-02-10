import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
          className="w-full flex items-center gap-2 p-3 rounded-dropdown border border-border hover:bg-accent/30 transition-all text-left"
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
        <div className="border border-t-0 border-border rounded-b-dropdown p-4 space-y-5">
          {/* Duration & Buffer */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tafeltijd & buffer</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
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
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Groepsgrootte</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
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
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pacing</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
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
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seating limieten</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
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
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gebieden</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useSpecificAreas}
                  onChange={() => onSetOverride("areas", null)}
                  className="accent-primary"
                />
                <span className="text-sm">Alle gebieden ({areas.length})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useSpecificAreas}
                  onChange={() => onSetOverride("areas", [])}
                  className="accent-primary"
                />
                <span className="text-sm">Specifieke gebieden</span>
              </label>
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

          {/* Squeeze */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Squeeze</Label>
            <div className="mt-2 space-y-3">
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
          </div>

          {/* Display */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weergave</Label>
            <div className="mt-2 flex gap-6">
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
