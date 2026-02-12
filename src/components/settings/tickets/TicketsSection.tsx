import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket as TicketIcon, ChevronRight, Archive, Loader2, Plus } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { useArchiveTicket, useRestoreTicket, useDuplicateTicket } from "@/hooks/useTicketMutations";
import { TicketCard } from "./TicketCard";
import { EmptyState } from "@/components/polar/EmptyState";
import { NestoButton } from "@/components/polar/NestoButton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TicketsSectionProps {
  locationId: string;
}

export function TicketsSection({ locationId }: TicketsSectionProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useTickets(locationId);
  const { mutate: archiveTicket } = useArchiveTicket(locationId);
  const { mutate: restoreTicket } = useRestoreTicket(locationId);
  const { mutate: duplicateTicket } = useDuplicateTicket(locationId);

  const [archivedOpen, setArchivedOpen] = useState(false);

  const visibleTickets = data?.visibleTickets ?? [];
  const archivedTickets = data?.archivedTickets ?? [];

  const handleAdd = () => navigate("/instellingen/reserveringen/tickets/nieuw");
  const handleEdit = (ticketId: string) => navigate(`/instellingen/reserveringen/tickets/${ticketId}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleTickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="Nog geen tickets"
          description="Maak je eerste reserveringsproduct aan."
          action={{ label: "Eerste ticket aanmaken", onClick: handleAdd, icon: Plus }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onEdit={() => handleEdit(ticket.id)}
              onDuplicate={() => duplicateTicket(ticket.id)}
              onArchive={() => archiveTicket(ticket.id)}
            />
          ))}
        </div>
      )}

      {/* Gearchiveerde sectie */}
      {archivedTickets.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen} className="mt-6 bg-muted/30 rounded-lg p-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            <ChevronRight className={`h-4 w-4 transition-transform ${archivedOpen ? "rotate-90" : ""}`} />
            <Archive className="h-4 w-4" />
            Gearchiveerd ({archivedTickets.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {archivedTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">{ticket.display_title}</span>
                  <span className="text-xs text-muted-foreground ml-2">({ticket.name})</span>
                </div>
                <NestoButton size="sm" variant="ghost" onClick={() => restoreTicket(ticket.id)}>
                  Herstellen
                </NestoButton>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
