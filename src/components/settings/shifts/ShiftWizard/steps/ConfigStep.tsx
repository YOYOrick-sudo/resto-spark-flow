import { useShiftWizard } from "../ShiftWizardContext";
import { useTickets } from "@/hooks/useTickets";
import { useAreasWithTables } from "@/hooks/useAreasWithTables";
import { TicketConfigPanel } from "./config/TicketConfigPanel";

export function ConfigStep() {
  const { selectedTickets, ticketOverrides, setTicketOverride, locationId, interval } = useShiftWizard();
  const { data: ticketData } = useTickets(locationId);
  const { data: areas = [] } = useAreasWithTables(locationId);

  const activeTickets = (ticketData?.visibleTickets ?? []).filter(
    (t) => t.status === "active" && selectedTickets.includes(t.id)
  );

  const isSingle = activeTickets.length === 1;

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
            arrivalInterval={interval}
            isSingle={isSingle}
            defaultOpen={index === 0}
            onSetOverride={(field, value) => setTicketOverride(ticket.id, field, value)}
          />
        ))}
      </div>
    </div>
  );
}
