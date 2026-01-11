import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { useShiftWizard, MOCK_TICKETS } from "../ShiftWizardContext";
import { Check, Ticket } from "lucide-react";

export function TicketsStep() {
  const { selectedTickets, toggleTicket } = useShiftWizard();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Wat kunnen gasten reserveren?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Selecteer welke tickets beschikbaar zijn in deze shift. Tickets bepalen wat gasten kunnen boeken.
        </p>
      </div>

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
                "w-full flex items-start gap-3 p-4 rounded-lg border transition-all text-left",
                isSelected && !isDisabled && "border-primary bg-primary/5",
                !isSelected && !isDisabled && "border-border hover:border-primary/50 hover:bg-accent/30",
                isDisabled && "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                  isSelected && !isDisabled
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {isSelected && !isDisabled && (
                  <Check className="w-3 h-3 text-primary-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", isDisabled && "text-muted-foreground")}>
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
                <p className="text-sm text-muted-foreground mt-0.5">
                  {ticket.description}
                </p>
              </div>

              {/* Icon */}
              <Ticket className={cn(
                "w-5 h-5 shrink-0",
                isSelected && !isDisabled ? "text-primary" : "text-muted-foreground/50"
              )} />
            </button>
          );
        })}
      </div>

      {/* Info alert */}
      <InfoAlert
        variant="info"
        title="Tickets configureren is binnenkort beschikbaar"
        description="De standaard reservering is automatisch actief voor alle shifts."
      />

      {/* Selection summary */}
      <div className="text-sm text-muted-foreground">
        {selectedTickets.length} {selectedTickets.length === 1 ? "ticket" : "tickets"} geselecteerd
      </div>
    </div>
  );
}
