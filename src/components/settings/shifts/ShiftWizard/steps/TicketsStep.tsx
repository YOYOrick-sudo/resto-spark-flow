import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { useShiftWizard, MOCK_TICKETS } from "../ShiftWizardContext";
import { Check, Ticket } from "lucide-react";

export function TicketsStep() {
  const { selectedTickets, toggleTicket } = useShiftWizard();

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Wat kunnen gasten reserveren?</h3>

      {/* Tickets list */}
      <div className="space-y-2">
        {MOCK_TICKETS.map((ticket) => {
          const isSelected = selectedTickets.includes(ticket.id);
          const isDisabled = ticket.comingSoon;

          return (
            <button
              key={ticket.id}
              type="button"
              onClick={() => !isDisabled && toggleTicket(ticket.id)}
              disabled={isDisabled}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-dropdown border transition-all text-left",
                isSelected && !isDisabled && "border-selected-border bg-selected-bg",
                !isSelected && !isDisabled && "border-border hover:border-primary/50 hover:bg-accent/30",
                isDisabled && "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                  isSelected && !isDisabled
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {isSelected && !isDisabled && (
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-medium", isDisabled && "text-muted-foreground")}>
                    {ticket.name}
                  </span>
                  {ticket.isDefault && (
                    <NestoBadge variant="outline" className="text-xs">
                      Standaard
                    </NestoBadge>
                  )}
                  {ticket.comingSoon && (
                    <NestoBadge variant="soon" className="text-xs">
                      Coming soon
                    </NestoBadge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ticket.description}
                </p>
              </div>

              {/* Icon */}
              <Ticket className={cn(
                "w-4 h-4 shrink-0",
                isSelected && !isDisabled ? "text-primary" : "text-muted-foreground/50"
              )} />
            </button>
          );
        })}
      </div>

      {/* Info + summary combined */}
      <p className="text-xs text-muted-foreground">
        {selectedTickets.length} {selectedTickets.length === 1 ? "ticket" : "tickets"} geselecteerd · Tickets configureren is binnenkort beschikbaar
      </p>
    </div>
  );
}
