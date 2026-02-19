import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { useTransitionStatus } from "@/hooks/useTransitionStatus";
import { useAssignTable } from "@/hooks/useAssignTable";
import { ChevronDown, ChevronUp, Wand2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent, pointerWithin, useSensor, useSensors, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { DensityType } from "./DensityToggle";
import type { Reservation } from "@/types/reservation";
import type { AreaWithTables } from "@/types/reservations";
import {
  getDisplayName,
  getHourLabels,
  timeToMinutes,
  minutesToTime,
  getSeatedCountAtTime,
  checkTimeConflict,
  type GridTimeConfig,
  defaultGridConfig,
} from "@/lib/reservationUtils";
import { getPacingLimitForTime } from "@/data/pacingMockData";
import { useAreasForGrid } from "@/hooks/useAreasWithTables";
import { useUserContext } from "@/contexts/UserContext";
import { useShifts } from "@/hooks/useShifts";
import { EmptyState } from "@/components/polar";
import { Calendar } from "lucide-react";
import { TableRow, STICKY_COL_WIDTH } from "./TableRow";
import { ReservationBlock } from "./ReservationBlock";
import { nestoToast } from "@/lib/nestoToast";
import { QuickReservationPanel } from "./QuickReservationPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Ghost position type for drag preview
interface GhostPosition {
  tableId: string;
  startTime: string;
  endTime: string;
  left: number;
  snappedLeft: number;
  width: number;
  topOffset: number;
}

interface ReservationGridViewProps {
  selectedDate: Date;
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
  onReservationUpdate?: () => void;
  config?: GridTimeConfig;
  density?: DensityType;
}

// Grid lines component
function GridLines({ config }: { config: GridTimeConfig }) {
  const hours = useMemo(() => {
    const result = [];
    for (let h = config.startHour; h <= config.endHour; h++) result.push(h);
    return result;
  }, [config.startHour, config.endHour]);

  const hourWidth = 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;

  return (
    <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none" style={{ left: `${STICKY_COL_WIDTH}px` }}>
      {hours.map((hour, hourIndex) => (
        <div key={hour} className="absolute top-0 bottom-0">
          <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${hourIndex * hourWidth}px` }} />
          {[1, 2, 3].map((q) => (
            <div key={q} className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: `${hourIndex * hourWidth + q * quarterWidth}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Timeline header
function TimelineHeader({ config }: { config: GridTimeConfig }) {
  const hourLabels = useMemo(() => getHourLabels(config), [config]);
  const hourWidth = 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;
  const totalWidth = hourLabels.length * hourWidth;

  return (
    <div className="sticky top-0 z-20 flex border-b-2 border-border bg-card">
      <div className="sticky left-0 z-30 flex-shrink-0 bg-card border-r-2 border-border h-10" style={{ width: `${STICKY_COL_WIDTH}px` }} />
      <div className="relative h-10" style={{ width: `${totalWidth}px` }}>
        {hourLabels.map((_, hourIndex) => (
          <div key={hourIndex} className="absolute top-0 bottom-0">
            <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${hourIndex * hourWidth}px` }} />
            {[1, 2, 3].map((q) => (
              <div key={q} className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: `${hourIndex * hourWidth + q * quarterWidth}px` }} />
            ))}
          </div>
        ))}
        {hourLabels.map((hour, index) => (
          <div key={hour} className="absolute top-0 h-10 flex items-center justify-center" style={{ left: `${index * hourWidth}px`, transform: 'translateX(-50%)' }}>
            <span className="text-sm font-semibold text-muted-foreground bg-card px-1.5">{hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Occupancy color helper
function getOccupancyColor(count: number, limit: number): string {
  if (count === 0) return "text-muted-foreground";
  const percentage = (count / limit) * 100;
  if (percentage <= 70) return "text-success font-bold";
  if (percentage <= 100) return "text-warning font-bold";
  return "text-destructive font-bold";
}

// Seated count row
function SeatedCountRow({
  reservations,
  config,
  isExpanded,
  onToggle,
  onSlotClick,
  isCompact = false,
}: {
  reservations: Reservation[];
  config: GridTimeConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onSlotClick?: (time: string) => void;
  isCompact?: boolean;
}) {
  const hourLabels = useMemo(() => getHourLabels(config), [config]);
  const quarterWidth = 15 * config.pixelsPerMinute;

  const quarterSlots = useMemo(() => {
    const slots: string[] = [];
    for (const hour of hourLabels) {
      const h = parseInt(hour.split(':')[0]);
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:15`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
      slots.push(`${h.toString().padStart(2, '0')}:45`);
    }
    return slots;
  }, [hourLabels]);

  const seatedData = useMemo(() => {
    return quarterSlots.map((time) => ({
      time,
      count: getSeatedCountAtTime(reservations, time),
      limit: getPacingLimitForTime(time),
    }));
  }, [reservations, quarterSlots]);

  return (
    <div className="flex border-b-2 border-border bg-secondary sticky top-[40px] z-20">
      <div className={cn("sticky left-0 z-30 flex-shrink-0 flex items-center justify-between px-3 bg-secondary border-r-2 border-border", isCompact ? "py-1" : "py-2")} style={{ width: `${STICKY_COL_WIDTH}px` }}>
        <span className="text-xs font-semibold text-muted-foreground">Pacing</span>
        <button onClick={onToggle} className="p-0.5 hover:bg-muted rounded transition-colors">
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
      <div className="flex">
        {seatedData.map(({ time, count, limit }, index) => {
          const percentage = limit > 0 ? Math.round((count / limit) * 100) : 0;
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div onClick={() => onSlotClick?.(time)} className={cn("text-caption flex items-center justify-center py-2 cursor-pointer transition-colors hover:bg-primary/10", index % 4 === 0 ? "border-l border-border" : "border-l border-border/50", index === 0 && "border-l-0")} style={{ width: `${quarterWidth}px` }}>
                  <span className={getOccupancyColor(count, limit)}>{count}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span className="font-semibold">{time}</span><br />
                {count}/{limit} gasten ({percentage}%)<br />
                <span className="text-primary">Klik om toe te voegen</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// Zone header
function ZoneHeader({ name, isCompact = false }: { name: string; isCompact?: boolean }) {
  return (
    <div className={cn("flex bg-secondary border-b border-t border-border", isCompact ? "h-7" : "h-8")}>
      <div className="sticky left-0 z-30 flex-shrink-0 bg-secondary border-r-2 border-border flex items-center px-3" style={{ width: `${STICKY_COL_WIDTH}px` }}>
        <span className="text-xs font-bold text-foreground uppercase tracking-wide whitespace-nowrap">{name}</span>
      </div>
      <div className="flex-1" />
    </div>
  );
}

// Now indicator
function NowIndicator({ config }: { config: GridTimeConfig }) {
  const [position, setPosition] = useState<number | null>(null);
  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      const gridStartMinutes = config.startHour * 60;
      const gridEndMinutes = config.endHour * 60;
      if (currentTimeMinutes >= gridStartMinutes && currentTimeMinutes < gridEndMinutes) {
        setPosition((currentTimeMinutes - gridStartMinutes) * config.pixelsPerMinute);
      } else {
        setPosition(null);
      }
    };
    updatePosition();
    const interval = setInterval(updatePosition, 60000);
    return () => clearInterval(interval);
  }, [config]);

  if (position === null) return null;
  const leftPos = STICKY_COL_WIDTH + position;

  return (
    <>
      <div className="absolute top-0 bottom-0 bg-destructive/8 pointer-events-none z-10" style={{ left: `${leftPos - 3}px`, width: '6px' }} />
      <div className="absolute top-0 bottom-0 w-[2px] bg-destructive z-30 pointer-events-none" style={{ left: `${leftPos}px` }}>
        <div className="sticky top-1 -translate-x-1/2 w-fit">
          <div className="bg-destructive text-destructive-foreground text-caption font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">NU</div>
        </div>
      </div>
    </>
  );
}

// Ghost preview
function GhostPreview({ position, hasConflict, guestCount, isDropAnimating = false, finalDropPosition }: {
  position: GhostPosition; hasConflict: boolean; guestCount: number; isDropAnimating?: boolean; finalDropPosition?: GhostPosition | null;
}) {
  const displayPosition = isDropAnimating && finalDropPosition ? finalDropPosition : position;
  return (
    <div
      className={cn("absolute rounded-md pointer-events-none will-change-transform shadow-xl",
        hasConflict ? "bg-destructive/70 border-2 border-destructive" : "bg-primary/70 border-2 border-primary",
        isDropAnimating && "opacity-0"
      )}
      style={{
        transform: `translate3d(${STICKY_COL_WIDTH + displayPosition.snappedLeft}px, ${displayPosition.topOffset}px, 0)`,
        width: `${displayPosition.width}px`, height: '36px', zIndex: 50, left: 0, top: 0,
        transition: isDropAnimating ? 'transform 100ms ease-out, opacity 150ms ease-out 100ms' : 'transform 50ms ease-out',
      }}
    >
      <div className="flex items-center justify-between h-full px-2.5">
        <span className={cn("font-bold text-sm", hasConflict ? "text-destructive-foreground" : "text-primary-foreground")}>{guestCount}p</span>
        <span className={cn("text-xs font-medium", hasConflict ? "text-destructive-foreground" : "text-primary-foreground")}>{displayPosition.startTime}</span>
      </div>
    </div>
  );
}

// Unassigned badge-list (collapsible, above areas)
function UnassignedGridRow({
  reservations,
  config,
  onReservationClick,
  isCompact,
  locationId,
  density,
}: {
  reservations: Reservation[];
  config: GridTimeConfig;
  onReservationClick?: (r: Reservation) => void;
  isCompact: boolean;
  locationId?: string;
  density: DensityType;
}) {
  const [open, setOpen] = useState(true);
  const assignTable = useAssignTable();

  const unassigned = useMemo(
    () => reservations.filter(r => !r.table_id && r.status !== 'cancelled' && r.status !== 'no_show'),
    [reservations]
  );

  if (unassigned.length === 0) return null;



  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;

  const quarterSlots: string[] = [];
  for (let hour = config.startHour; hour < config.endHour; hour++) {
    for (let quarter = 0; quarter < 4; quarter++) {
      const minutes = quarter * 15;
      const displayHour = hour >= 24 ? hour - 24 : hour;
      quarterSlots.push(`${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-warning/30 bg-warning/5">
        {/* Row: sticky label + timeline */}
        <div className={cn("flex", isCompact ? "h-9" : "h-12")}>
          {/* Sticky left column */}
          <div
            className="sticky left-0 z-30 flex-shrink-0 flex items-center gap-1.5 px-3 border-r-2 border-border bg-warning/5"
            style={{ width: `${STICKY_COL_WIDTH}px` }}
          >
            <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 min-w-0">
              {open ? <ChevronUp className="h-3 w-3 text-warning flex-shrink-0" /> : <ChevronDown className="h-3 w-3 text-warning flex-shrink-0" />}
              <span className="text-xs font-semibold text-warning truncate">Niet toegew.</span>
              <span className="text-caption font-bold text-warning bg-warning/15 px-1.5 py-0.5 rounded-full flex-shrink-0">{unassigned.length}</span>
            </CollapsibleTrigger>
          </div>

          {/* Timeline area with blocks */}
          <CollapsibleContent asChild forceMount className="data-[state=closed]:hidden">
            <div className="relative flex-shrink-0" style={{ width: `${gridWidth}px` }}>
              {/* Quarter-slot grid lines */}
              <div className="absolute inset-0 flex">
                {quarterSlots.map((time, index) => (
                  <div
                    key={time}
                    className={cn(
                      "h-full",
                      index % 4 === 0 ? "border-l border-border/50" : "border-l border-border/20"
                    )}
                    style={{ width: `${quarterWidth}px` }}
                  />
                ))}
              </div>

              {/* Reservation blocks */}
              <div className="absolute inset-0 z-10">
                {unassigned.map((r) => (
                  <ReservationBlock
                    key={r.id}
                    reservation={r}
                    config={config}
                    onClick={onReservationClick}
                    onAssign={(res) => {
                      if (!locationId) return;
                      assignTable.mutate({
                        location_id: res.location_id,
                        date: res.reservation_date,
                        time: res.start_time,
                        party_size: res.party_size,
                        duration_minutes: res.duration_minutes,
                        shift_id: res.shift_id,
                        ticket_id: res.ticket_id,
                        reservation_id: res.id,
                      });
                    }}
                    density={density}
                    variant="unassigned"
                  />
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}

export function ReservationGridView({
  selectedDate,
  reservations,
  onReservationClick,
  onReservationUpdate,
  config: configProp,
  density = "compact",
}: ReservationGridViewProps) {
  const isCompact = density === "compact";
  const transition = useTransitionStatus();
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic timeline based on active shifts
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const { data: shifts = [], isLoading: shiftsLoading } = useShifts(locationId);

  const dynamicConfig = useMemo<GridTimeConfig>(() => {
    if (configProp) return configProp;
    if (shifts.length === 0) return defaultGridConfig;

    let earliest = Infinity;
    let latest = -Infinity;
    for (const shift of shifts) {
      const start = timeToMinutes(shift.start_time);
      const end = timeToMinutes(shift.end_time);
      // Handle overnight shifts
      const effectiveEnd = end <= start ? end + 24 * 60 : end;
      if (start < earliest) earliest = start;
      if (effectiveEnd > latest) latest = effectiveEnd;
    }

    if (earliest === Infinity) return defaultGridConfig;

    // 30 min buffer on each side
    const startHour = Math.floor((earliest - 30) / 60);
    const endHour = Math.ceil((latest + 30) / 60);

    return {
      startHour: Math.max(0, startHour),
      endHour: Math.min(30, endHour), // max 30 for overnight
      intervalMinutes: 15,
      pixelsPerMinute: 2,
    };
  }, [configProp, shifts]);

  const config = dynamicConfig;
  const [seatedExpanded, setSeatedExpanded] = useState(true);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);
  const [isDropAnimating, setIsDropAnimating] = useState(false);
  const [finalDropPosition, setFinalDropPosition] = useState<GhostPosition | null>(null);
  const [animatingReservationId, setAnimatingReservationId] = useState<string | null>(null);
  const [quickReservationOpen, setQuickReservationOpen] = useState(false);
  const [quickReservationTime, setQuickReservationTime] = useState<string | null>(null);
  const [quickReservationTableId, setQuickReservationTableId] = useState<string | null>(null);

  const dateString = format(selectedDate, "yyyy-MM-dd");

  // Use real areas from database
  const { data: areas = [] } = useAreasForGrid(locationId);

  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  const totalWidth = STICKY_COL_WIDTH + gridWidth;

  const HEADER_HEIGHT = 40;
  const SEATED_ROW_HEIGHT = isCompact ? 36 : 44;
  const ZONE_HEADER_HEIGHT = isCompact ? 28 : 32;
  const TABLE_ROW_HEIGHT = isCompact ? 36 : 56;

  const tablePositions = useMemo(() => {
    const positions: Record<string, number> = {};
    let currentTop = HEADER_HEIGHT + SEATED_ROW_HEIGHT;
    areas.forEach(area => {
      if (!area.tables || area.tables.length === 0) return;
      currentTop += ZONE_HEADER_HEIGHT;
      area.tables.forEach(table => {
        const ghostHeight = isCompact ? 28 : 36;
        const verticalOffset = (TABLE_ROW_HEIGHT - ghostHeight) / 2;
        positions[table.id] = currentTop + verticalOffset;
        currentTop += TABLE_ROW_HEIGHT;
      });
    });
    return positions;
  }, [areas, isCompact, HEADER_HEIGHT, SEATED_ROW_HEIGHT, ZONE_HEADER_HEIGHT, TABLE_ROW_HEIGHT]);

  // Scroll to current time on mount
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      const gridStartMinutes = config.startHour * 60;
      if (currentTimeMinutes >= gridStartMinutes) {
        containerRef.current.scrollLeft = Math.max(0, (currentTimeMinutes - gridStartMinutes) * config.pixelsPerMinute - 200);
      }
    }
  }, [config]);

  // Filter reservations per table
  const getReservationsForTable = useCallback((tableId: string) => {
    return reservations.filter(r => r.table_id === tableId);
  }, [reservations]);

  // DnD handlers - mutations disabled in 4.7a
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, over, delta } = event;
    if (!over || !active.data.current?.reservation) { setGhostPosition(null); return; }
    const reservation = active.data.current.reservation as Reservation;
    const targetTableId = over.data.current?.tableId as string;
    if (!targetTableId || !tablePositions[targetTableId]) { setGhostPosition(null); return; }

    const durationMinutes = timeToMinutes(reservation.end_time) - timeToMinutes(reservation.start_time);
    const reservationWidth = durationMinutes * config.pixelsPerMinute;
    const originalStartMinutes = timeToMinutes(reservation.start_time) - config.startHour * 60;
    const originalLeft = originalStartMinutes * config.pixelsPerMinute;
    const maxLeft = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute - reservationWidth;
    const exactLeft = originalLeft + (delta?.x || 0);
    const clampedLeft = Math.max(0, Math.min(exactLeft, maxLeft));
    const snappedMinutes = Math.round(clampedLeft / config.pixelsPerMinute / 15) * 15;
    const clampedMinutes = Math.max(0, Math.min(snappedMinutes, (config.endHour - config.startHour) * 60 - durationMinutes));
    const snappedLeft = clampedMinutes * config.pixelsPerMinute;
    const newStartTime = minutesToTime(config.startHour * 60 + clampedMinutes);
    const newEndTime = minutesToTime(timeToMinutes(newStartTime) + durationMinutes);

    setGhostPosition({
      tableId: targetTableId, startTime: newStartTime, endTime: newEndTime,
      left: clampedLeft, snappedLeft, width: reservationWidth, topOffset: tablePositions[targetTableId],
    });
  }, [config, tablePositions]);

  const ghostHasConflict = useMemo(() => {
    if (!ghostPosition || !activeReservation) return false;
    return checkTimeConflict(reservations, ghostPosition.tableId, ghostPosition.startTime, ghostPosition.endTime, activeReservation.id).hasConflict;
  }, [ghostPosition, reservations, activeReservation]);

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    nestoToast.info("Verplaatsen wordt binnenkort beschikbaar");
    setActiveReservation(null);
    setGhostPosition(null);
  }, []);

  const handleResize = useCallback((_reservationId: string, _newStartTime: string, _newEndTime: string): boolean => {
    nestoToast.info("Aanpassen wordt binnenkort beschikbaar");
    return false;
  }, []);

  const handleCheckIn = useCallback((reservation: Reservation) => {
    if (reservation.status !== 'confirmed') return;
    transition.mutate({
      reservation_id: reservation.id,
      new_status: 'seated' as const,
      location_id: reservation.location_id,
      customer_id: reservation.customer_id,
    }, {
      onSuccess: () => nestoToast.success('Ingecheckt'),
      onError: (err) => nestoToast.error(err.message),
    });
  }, [transition]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.reservation) {
      const reservation = event.active.data.current.reservation as Reservation;
      setActiveReservation(reservation);
      const tableId = reservation.table_id;
      if (tableId && tablePositions[tableId] !== undefined) {
        const durationMinutes = timeToMinutes(reservation.end_time) - timeToMinutes(reservation.start_time);
        const reservationWidth = durationMinutes * config.pixelsPerMinute;
        const startMinutes = timeToMinutes(reservation.start_time) - config.startHour * 60;
        const startLeft = startMinutes * config.pixelsPerMinute;
        setGhostPosition({ tableId, startTime: reservation.start_time, endTime: reservation.end_time, left: startLeft, snappedLeft: startLeft, width: reservationWidth, topOffset: tablePositions[tableId] });
      }
    }
  }, [tablePositions, config]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleSlotClick = useCallback((time: string) => {
    setQuickReservationTime(time);
    setQuickReservationTableId(null);
    setQuickReservationOpen(true);
  }, []);

  const handleEmptySlotClick = useCallback((tableId: string, time: string) => {
    setQuickReservationTime(time);
    setQuickReservationTableId(tableId);
    setQuickReservationOpen(true);
  }, []);

  const handleQuickReservationSubmit = useCallback(() => {
    nestoToast.info("Aanmaken wordt binnenkort beschikbaar");
  }, []);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart} onDragMove={handleDragMove} collisionDetection={pointerWithin}>
      <div className="relative h-full overflow-hidden bg-card">
        <div ref={containerRef} className="h-full overflow-auto">
          <div className="min-w-max relative" style={{ minWidth: `${totalWidth}px` }}>
            <GridLines config={config} />
            <NowIndicator config={config} />
            <TimelineHeader config={config} />

            <SeatedCountRow
              reservations={reservations}
              config={config}
              isExpanded={seatedExpanded}
              onToggle={() => setSeatedExpanded(!seatedExpanded)}
              onSlotClick={handleSlotClick}
              isCompact={isCompact}
            />

            <UnassignedGridRow
              reservations={reservations}
              config={config}
              onReservationClick={onReservationClick}
              isCompact={isCompact}
              locationId={locationId}
              density={density}
            />

            {areas.map((area) => {
              if (!area.tables || area.tables.length === 0) return null;
              return (
                <div key={area.id}>
                  <ZoneHeader name={area.name} isCompact={isCompact} />
                  {area.tables.map((table, index) => (
                    <TableRow
                      key={table.id}
                      table={table}
                      date={dateString}
                      config={config}
                      onReservationClick={onReservationClick}
                      onReservationCheckIn={handleCheckIn}
                      onReservationResize={handleResize}
                      onEmptySlotClick={handleEmptySlotClick}
                      isOdd={index % 2 === 1}
                      activeReservationId={activeReservation?.id || animatingReservationId}
                      isDropTarget={ghostPosition?.tableId === table.id}
                      ghostStartTime={ghostPosition?.tableId === table.id ? ghostPosition.startTime : null}
                      isDropAnimating={isDropAnimating}
                      density={density}
                      reservations={getReservationsForTable(table.id)}
                    />
                  ))}
                </div>
              );
            })}

            {(ghostPosition || isDropAnimating) && (activeReservation || finalDropPosition) && (
              <GhostPreview
                position={ghostPosition || finalDropPosition!}
                hasConflict={ghostHasConflict}
                guestCount={activeReservation?.party_size || 0}
                isDropAnimating={isDropAnimating}
                finalDropPosition={finalDropPosition}
              />
            )}
          </div>
        </div>
      </div>

      <QuickReservationPanel
        open={quickReservationOpen}
        onOpenChange={(open) => { setQuickReservationOpen(open); if (!open) setQuickReservationTableId(null); }}
        initialTime={quickReservationTime}
        initialTableId={quickReservationTableId}
        date={dateString}
        onSubmit={handleQuickReservationSubmit}
      />
    </DndContext>
  );
}
