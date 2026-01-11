import { MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoCard } from "@/components/polar/NestoCard";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { Skeleton } from "@/components/ui/skeleton";
import { useShiftWizard, MOCK_TICKETS } from "../ShiftWizardContext";
import { useAreasWithTables } from "@/hooks/useAreasWithTables";
import { useUserContext } from "@/contexts/UserContext";

export function AreasStep() {
  const { selectedTickets, areasByTicket, setAllAreasForTicket, toggleAreaForTicket } = useShiftWizard();
  const { currentLocation } = useUserContext();
  const { data: areas = [], isLoading } = useAreasWithTables(currentLocation?.id, { 
    includeInactive: false 
  });

  // Get selected ticket objects
  const activeTickets = MOCK_TICKETS.filter(t => selectedTickets.includes(t.id) && !t.comingSoon);

  // Calculate total seats for an area
  const getAreaCapacity = (area: typeof areas[0]) => {
    const tableCount = area.tables?.length ?? 0;
    const seatCount = area.tables?.reduce((sum, t) => sum + t.max_capacity, 0) ?? 0;
    return { tableCount, seatCount };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Welke gebieden zijn beschikbaar?</h3>

      {/* Per ticket configuration */}
      <div className="space-y-3">
        {activeTickets.map(ticket => {
          const config = areasByTicket[ticket.id] ?? { allAreas: true, selectedAreaIds: [] };
          const isAllAreas = config.allAreas;

          return (
            <div key={ticket.id} className="rounded-dropdown border border-border bg-card p-4">
              {/* Ticket header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ticket.name}</span>
                  {ticket.isDefault && (
                    <NestoBadge variant="outline" className="text-xs">
                      Standaard
                    </NestoBadge>
                  )}
                </div>
              </div>

              {/* Radio options */}
              <div className="space-y-1.5">
                {/* All areas option */}
                <button
                  type="button"
                  onClick={() => setAllAreasForTicket(ticket.id, true)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2.5 rounded-button border transition-all text-left",
                    isAllAreas 
                      ? "border-selected-border bg-selected-bg" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                    isAllAreas ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}>
                    {isAllAreas && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                  </div>
                  <span className="text-sm">Alle gebieden ({areas.length})</span>
                </button>

                {/* Specific areas option */}
                <button
                  type="button"
                  onClick={() => setAllAreasForTicket(ticket.id, false)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2.5 rounded-button border transition-all text-left",
                    !isAllAreas 
                      ? "border-selected-border bg-selected-bg" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                    !isAllAreas ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}>
                    {!isAllAreas && <div className="w-1 h-1 rounded-full bg-primary-foreground" />}
                  </div>
                  <span className="text-sm">Specifieke gebieden</span>
                </button>
              </div>

              {/* Area checkboxes (when specific selected) */}
              {!isAllAreas && (
                <div className="mt-3 ml-6 space-y-1.5">
                  {areas.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">
                      Geen gebieden gevonden.
                    </p>
                  ) : (
                    areas.map(area => {
                      const { tableCount, seatCount } = getAreaCapacity(area);
                      const isSelected = config.selectedAreaIds.includes(area.id);

                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => toggleAreaForTicket(ticket.id, area.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-2 rounded-button border transition-all text-left",
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          )}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1">{area.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {tableCount}t · {seatCount}s
                          </span>
                        </button>
                      );
                    })
                  )}

                  {!isAllAreas && config.selectedAreaIds.length === 0 && areas.length > 0 && (
                    <p className="text-xs text-warning">Selecteer minimaal één gebied.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Standaard zijn alle gebieden beschikbaar voor elk ticket.
      </p>
    </div>
  );
}
