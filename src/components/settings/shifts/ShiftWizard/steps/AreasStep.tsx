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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Welke gebieden zijn beschikbaar?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Selecteer de gebieden waar gasten kunnen reserveren per ticket. Standaard zijn alle gebieden beschikbaar.
        </p>
      </div>

      {/* Per ticket configuration */}
      <div className="space-y-4">
        {activeTickets.map(ticket => {
          const config = areasByTicket[ticket.id] ?? { allAreas: true, selectedAreaIds: [] };
          const isAllAreas = config.allAreas;

          return (
            <NestoCard key={ticket.id} className="p-5">
              {/* Ticket header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ticket.name}</span>
                  {ticket.isDefault && (
                    <NestoBadge variant="outline" className="text-xs">
                      Standaard
                    </NestoBadge>
                  )}
                </div>
                <NestoBadge variant="success" className="text-xs">
                  Actief
                </NestoBadge>
              </div>

              {/* Radio options */}
              <div className="space-y-2">
                {/* All areas option */}
                <button
                  type="button"
                  onClick={() => setAllAreasForTicket(ticket.id, true)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-dropdown border transition-all text-left",
                    isAllAreas 
                      ? "border-selected-border bg-selected-bg" 
                      : "border-border hover:border-primary/50 hover:bg-accent/30"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    isAllAreas ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}>
                    {isAllAreas && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">Alle gebieden</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({areas.length} gebieden)
                    </span>
                  </div>
                </button>

                {/* Specific areas option */}
                <button
                  type="button"
                  onClick={() => setAllAreasForTicket(ticket.id, false)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-dropdown border transition-all text-left",
                    !isAllAreas 
                      ? "border-selected-border bg-selected-bg" 
                      : "border-border hover:border-primary/50 hover:bg-accent/30"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    !isAllAreas ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}>
                    {!isAllAreas && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                  </div>
                  <span className="text-sm font-medium">Specifieke gebieden selecteren</span>
                </button>
              </div>

              {/* Area checkboxes (when specific selected) */}
              {!isAllAreas && (
                <div className="mt-4 ml-7 space-y-2">
                  {areas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Geen gebieden gevonden. Voeg eerst gebieden toe in de tafelinstellingen.
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
                            "w-full flex items-center gap-3 p-3 rounded-button border transition-all text-left",
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {/* Checkbox */}
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>

                          {/* Area info */}
                          <div className="flex-1 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm">{area.name}</span>
                          </div>

                          {/* Capacity info */}
                          <span className="text-xs text-muted-foreground">
                            {tableCount} tafels · {seatCount} stoelen
                          </span>
                        </button>
                      );
                    })
                  )}

                  {/* Validation warning */}
                  {!isAllAreas && config.selectedAreaIds.length === 0 && areas.length > 0 && (
                    <p className="text-sm text-warning mt-2">
                      Selecteer minimaal één gebied.
                    </p>
                  )}
                </div>
              )}
            </NestoCard>
          );
        })}
      </div>

      {/* Info alert */}
      <InfoAlert
        variant="info"
        title="Gebieden per ticket configureren"
        description="Hiermee bepaal je in welke gebieden gasten kunnen reserveren met een specifiek ticket. Standaard zijn alle gebieden beschikbaar."
      />
    </div>
  );
}
