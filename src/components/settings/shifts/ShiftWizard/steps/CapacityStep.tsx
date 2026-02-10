import { Users, Grid3X3, Timer, Gauge, Minimize2 } from "lucide-react";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { useShiftWizard } from "../ShiftWizardContext";
import { useTickets, type TicketWithMeta } from "@/hooks/useTickets";
import { useAreasWithTables } from "@/hooks/useAreasWithTables";
import type { AreaWithTables } from "@/types/reservations";

interface CapacityRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function CapacityRow({ icon: Icon, label, value }: CapacityRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

interface TicketCapacityCardProps {
  ticket: TicketWithMeta;
  areas: AreaWithTables[];
}

function TicketCapacityCard({ ticket, areas }: TicketCapacityCardProps) {
  const { ticketOverrides, getEffectiveValue } = useShiftWizard();
  const o = ticketOverrides[ticket.id];

  const duration = getEffectiveValue(ticket.id, "overrideDuration", ticket.duration_minutes);
  const minParty = getEffectiveValue(ticket.id, "overrideMinParty", ticket.min_party_size);
  const maxParty = getEffectiveValue(ticket.id, "overrideMaxParty", ticket.max_party_size);
  const pacingLimit = o?.pacingLimit;
  const seatingGuests = o?.seatingLimitGuests;
  const seatingRes = o?.seatingLimitReservations;
  const squeezeEnabled = o?.squeezeEnabled ?? false;
  const selectedAreas = o?.areas;

  // Calculate tables from effective areas
  const effectiveAreas = selectedAreas ? areas.filter((a) => selectedAreas.includes(a.id)) : areas;
  const tableCount = effectiveAreas.reduce((sum, a) => sum + a.tables.length, 0);
  const totalSeats = effectiveAreas.reduce((sum, a) => sum + a.tables.reduce((s, t) => s + t.max_capacity, 0), 0);

  const areaLabel = selectedAreas ? `${effectiveAreas.length} van ${areas.length}` : `Alle (${areas.length})`;
  const pacingLabel = pacingLimit ? `${pacingLimit} gasten/slot` : "Geen limiet";
  const seatingLabel =
    seatingGuests || seatingRes
      ? [seatingGuests && `${seatingGuests} gasten`, seatingRes && `${seatingRes} res.`].filter(Boolean).join(", ")
      : "Geen limiet";

  return (
    <div className="rounded-dropdown border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-secondary/50">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ticket.color }} />
        <span className="text-sm font-medium">{ticket.display_title}</span>
      </div>

      <div className="px-3 py-2">
        <p className="text-sm font-medium mb-2">
          {tableCount} tafels · {minParty}–{maxParty} gasten · {duration} min
          {totalSeats > 0 && <span className="text-muted-foreground"> · {totalSeats} stoelen</span>}
        </p>

        <div className="space-y-0.5">
          <CapacityRow icon={Grid3X3} label="Gebieden" value={areaLabel} />
          <CapacityRow icon={Gauge} label="Pacing" value={pacingLabel} />
          <CapacityRow icon={Users} label="Seating" value={seatingLabel} />
          <CapacityRow icon={Minimize2} label="Squeeze" value={squeezeEnabled ? "Aan" : "Uit"} />
        </div>
      </div>
    </div>
  );
}

export function CapacityStep() {
  const { selectedTickets, ticketOverrides, locationId } = useShiftWizard();
  const { data: ticketData } = useTickets(locationId);
  const { data: areas = [] } = useAreasWithTables(locationId);

  const activeTickets = (ticketData?.visibleTickets ?? []).filter(
    (t) => t.status === "active" && selectedTickets.includes(t.id)
  );

  if (selectedTickets.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Capaciteit & regels</h3>
        <p className="text-sm text-muted-foreground">Selecteer eerst tickets in stap 2.</p>
      </div>
    );
  }

  // Check for warnings
  const warnings: string[] = [];
  selectedTickets.forEach((id) => {
    const o = ticketOverrides[id];
    if (o?.squeezeEnabled && !o.squeezeLimit) {
      const name = activeTickets.find((t) => t.id === id)?.display_title ?? "Ticket";
      warnings.push(`${name}: Squeeze is ingeschakeld maar er is geen limiet ingesteld`);
    }
  });

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Capaciteit & regels</h3>

      <div className="space-y-2">
        {activeTickets.map((ticket) => (
          <TicketCapacityCard key={ticket.id} ticket={ticket} areas={areas} />
        ))}
      </div>

      {warnings.map((w, i) => (
        <InfoAlert key={i} variant="warning" title={w} />
      ))}

      <p className="text-xs text-muted-foreground">
        Geavanceerde regels kunnen later worden geconfigureerd.
      </p>
    </div>
  );
}
