import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { timeToMinutes, formatTime } from '@/lib/reservationUtils';
import type { Table, AreaWithTables } from '@/types/reservations';
import type { Reservation } from '@/types/reservation';

export interface TableSelectorProps {
  value: string | null;                // table_id, '__auto__', or '__none__'
  onChange: (value: string) => void;
  areas: AreaWithTables[];
  partySize: number;
  date: string;
  startTime: string;
  effectiveDuration: number | null;
  reservationsForDate: Reservation[];
  recommendedTableId?: string | null;
  autoAssignEnabled?: boolean;
  showAutoOption?: boolean;
  showNoneOption?: boolean;
  currentTableId?: string | null;       // for move dialog: highlight current
  shiftAreas?: string[] | null;
  disabled?: boolean;
  placeholder?: string;
}

interface TableAvailability {
  table: Table;
  areaName: string;
  isOccupied: boolean;
  occupiedRange: string | null;
  fitsCapacity: boolean;
  isCurrent: boolean;
}

function getTableAvailability(
  areas: AreaWithTables[],
  partySize: number,
  startTime: string,
  effectiveDuration: number | null,
  reservationsForDate: Reservation[],
  currentTableId: string | null | undefined,
  shiftAreas: string[] | null | undefined,
): Map<string, { tables: TableAvailability[]; freeCount: number; totalCount: number; areaName: string; sortOrder: number }> {
  const result = new Map<string, { tables: TableAvailability[]; freeCount: number; totalCount: number; areaName: string; sortOrder: number }>();

  const startMin = timeToMinutes(startTime);
  const endMin = effectiveDuration ? startMin + effectiveDuration : startMin + 120;

  const filteredAreas = shiftAreas && shiftAreas.length > 0
    ? areas.filter(a => shiftAreas.includes(a.id))
    : areas;

  for (const area of filteredAreas) {
    if (!area.is_active) continue;
    const activeTables = (area.tables || []).filter(t => t.is_active);
    if (activeTables.length === 0) continue;

    let freeCount = 0;
    const tableAvails: TableAvailability[] = [];

    for (const table of activeTables) {
      const fitsCapacity = table.min_capacity <= partySize && table.max_capacity >= partySize;

      // Check occupation
      let isOccupied = false;
      let occupiedRange: string | null = null;
      const tableRes = reservationsForDate.filter(
        r => r.table_id === table.id && r.status !== 'cancelled' && r.status !== 'no_show' && r.status !== 'completed'
      );
      for (const r of tableRes) {
        const rStart = timeToMinutes(r.start_time);
        const rEnd = timeToMinutes(r.end_time);
        if (startMin < rEnd && endMin > rStart) {
          isOccupied = true;
          occupiedRange = `bezet ${formatTime(r.start_time)}–${formatTime(r.end_time)}`;
          break;
        }
      }

      const isCurrent = table.id === currentTableId;
      if (fitsCapacity && !isOccupied && !isCurrent) freeCount++;

      tableAvails.push({ table, areaName: area.name, isOccupied, occupiedRange, fitsCapacity, isCurrent });
    }

    result.set(area.id, {
      tables: tableAvails,
      freeCount,
      totalCount: activeTables.length,
      areaName: area.name,
      sortOrder: area.sort_order,
    });
  }

  return result;
}

export function TableSelector({
  value,
  onChange,
  areas,
  partySize,
  startTime,
  effectiveDuration,
  reservationsForDate,
  recommendedTableId,
  autoAssignEnabled = true,
  showAutoOption = true,
  showNoneOption = true,
  currentTableId,
  shiftAreas,
  disabled = false,
  placeholder = 'Selecteer tafel...',
}: TableSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const areaMap = useMemo(
    () => getTableAvailability(areas, partySize, startTime, effectiveDuration, reservationsForDate, currentTableId, shiftAreas),
    [areas, partySize, startTime, effectiveDuration, reservationsForDate, currentTableId, shiftAreas]
  );

  // Build display label for the trigger button
  const displayLabel = useMemo(() => {
    if (value === '__auto__') return 'Automatisch toewijzen';
    if (value === '__none__' || !value) return showNoneOption ? 'Niet toegewezen' : placeholder;
    // Find table name
    for (const area of areas) {
      const t = area.tables?.find(t => t.id === value);
      if (t) return `${t.display_label} (${area.name})`;
    }
    return placeholder;
  }, [value, areas, showNoneOption, placeholder]);

  // Sorted areas
  const sortedAreas = useMemo(() => {
    return Array.from(areaMap.entries()).sort((a, b) => a[1].sortOrder - b[1].sortOrder);
  }, [areaMap]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm text-left",
            "hover:bg-muted/50 focus:outline-none focus:!border-primary transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <span className={cn("flex items-center gap-2", !value || value === '__none__' ? 'text-muted-foreground' : 'text-foreground')}>
            {value === '__auto__' && <Sparkles className="h-3.5 w-3.5 text-primary" />}
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4}>
        <Command filter={(value, search) => {
          // Custom filter: search across table labels and area names
          if (!search) return 1;
          const lower = search.toLowerCase();
          // Check fixed options
          if (value === '__auto__' && 'automatisch toewijzen'.includes(lower)) return 1;
          if (value === '__none__' && 'niet toegewezen'.includes(lower)) return 1;
          if (value === '__show_all__') return 0; // never filter the toggle
          // Check table
          for (const area of areas) {
            const t = area.tables?.find(t => t.id === value);
            if (t) {
              if (t.display_label.toLowerCase().includes(lower) || area.name.toLowerCase().includes(lower)) return 1;
              return 0;
            }
          }
          return 0;
        }}>
          <CommandInput placeholder="Zoek tafel of area..." />
          <CommandList>
            <CommandEmpty>Geen tafels gevonden.</CommandEmpty>

            {/* Fixed options */}
            {(showAutoOption || showNoneOption) && (
              <CommandGroup>
                {showAutoOption && autoAssignEnabled && (
                  <CommandItem value="__auto__" onSelect={handleSelect}>
                    <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">Automatisch toewijzen</span>
                    {value === '__auto__' && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                )}
                {showNoneOption && (
                  <CommandItem value="__none__" onSelect={handleSelect}>
                    <span className="ml-5.5">Niet toegewezen</span>
                    {value === '__none__' && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                )}
              </CommandGroup>
            )}

            {(showAutoOption || showNoneOption) && <CommandSeparator />}

            {/* Area groups */}
            {sortedAreas.map(([areaId, areaData]) => {
              const visibleTables = showAll
                ? areaData.tables
                : areaData.tables.filter(t => t.fitsCapacity && !t.isOccupied);

              if (visibleTables.length === 0 && !showAll) return null;

              return (
                <CommandGroup
                  key={areaId}
                  heading={
                    <span className={cn(areaData.freeCount === 0 && 'text-muted-foreground/40')}>
                      {areaData.areaName} · {areaData.freeCount} van {areaData.totalCount} vrij
                    </span>
                  }
                >
                  {(showAll ? areaData.tables : visibleTables).map(({ table, isOccupied, occupiedRange, fitsCapacity, isCurrent }) => {
                    const isDisabled = isOccupied || !fitsCapacity || isCurrent;
                    const isSelected = value === table.id;
                    const isRecommended = table.id === recommendedTableId;

                    return (
                      <CommandItem
                        key={table.id}
                        value={table.id}
                        onSelect={handleSelect}
                        disabled={isDisabled}
                        className={cn(isDisabled && 'opacity-40')}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={cn("font-medium", isDisabled && "text-muted-foreground")}>
                            {table.display_label}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {table.max_capacity}p
                          </span>
                          {isRecommended && (
                            <NestoBadge variant="primary" size="sm" className="ml-1">
                              <Star className="h-3 w-3 mr-0.5 fill-current" />
                              Aanbevolen
                            </NestoBadge>
                          )}
                          {isCurrent && (
                            <span className="text-xs text-primary font-medium ml-1">Huidige</span>
                          )}
                          {isOccupied && occupiedRange && (
                            <span className="text-xs text-muted-foreground ml-auto">{occupiedRange}</span>
                          )}
                          {!fitsCapacity && !isOccupied && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {table.min_capacity}–{table.max_capacity}p
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="ml-auto h-3.5 w-3.5 text-primary shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}

            {/* Show all toggle */}
            {!showAll && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__show_all__"
                    onSelect={() => setShowAll(true)}
                    className="justify-center text-xs text-muted-foreground"
                  >
                    Toon alle tafels (incl. bezet)
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
