import { useState } from "react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { useShiftWizard } from "../ShiftWizardContext";
import { useTickets, type TicketWithMeta } from "@/hooks/useTickets";
import { TicketModal } from "@/components/settings/tickets/TicketModal";
import { Check, Plus, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const priceFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

function getPricingLabel(ticket: TicketWithMeta): string {
  if (!ticket.policyInfo || ticket.policyInfo.payment_type === "none") {
    return "Gratis";
  }
  const amount = priceFormatter.format((ticket.policyInfo.payment_amount_cents ?? 0) / 100);
  switch (ticket.policyInfo.payment_type) {
    case "deposit":
      return `${amount} p.p. deposit`;
    case "full_prepay":
      return `${amount} p.p.`;
    case "no_show_guarantee":
      return `No-show ${amount}`;
    default:
      return "Gratis";
  }
}

export function TicketsStep() {
  const { selectedTickets, toggleTicket, locationId } = useShiftWizard();
  const { data, isLoading } = useTickets(locationId);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeTickets = (data?.visibleTickets ?? []).filter((t) => t.status === "active");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Wat kunnen gasten reserveren?</h3>

      {/* Tickets list */}
      <div className="space-y-2">
        {activeTickets.map((ticket) => {
          const isSelected = selectedTickets.includes(ticket.id);
          const pricingLabel = getPricingLabel(ticket);

          return (
            <button
              key={ticket.id}
              type="button"
              onClick={() => toggleTicket(ticket.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-dropdown border transition-all text-left",
                isSelected && "border-selected-border bg-selected-bg",
                !isSelected && "border-border hover:border-primary/50 hover:bg-accent/30"
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {isSelected && (
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                )}
              </div>

              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                style={{ backgroundColor: ticket.color }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ticket.display_title}</span>
                  {ticket.is_default && (
                    <NestoBadge variant="outline" className="text-xs">
                      Standaard
                    </NestoBadge>
                  )}
                </div>
                {ticket.short_description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {ticket.short_description}
                  </p>
                )}
              </div>

              {/* Duration & pricing */}
              <div className="text-right shrink-0">
                <span className="text-sm font-medium">{ticket.duration_minutes} min</span>
                <p className="text-xs text-muted-foreground">{pricingLabel}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick-create button */}
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="w-full flex items-center gap-2 p-3 rounded-dropdown border border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-left"
      >
        <Plus className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Nieuw ticket aanmaken</span>
      </button>

      {/* Warning when no tickets selected */}
      {selectedTickets.length === 0 && (
        <InfoAlert variant="warning" title="Niet boekbaar">
          Shift is niet boekbaar zonder tickets. Selecteer minimaal één ticket.
        </InfoAlert>
      )}

      {/* Summary */}
      {selectedTickets.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedTickets.length} {selectedTickets.length === 1 ? "ticket" : "tickets"} geselecteerd
        </p>
      )}

      {/* Quick-create modal */}
      <TicketModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        locationId={locationId}
        editingTicket={null}
      />
    </div>
  );
}
