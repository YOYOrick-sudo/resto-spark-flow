import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Reservation,
  getActiveZones,
  getTablesByZone,
  getSeatedCountAtTime,
  getHourLabels,
  getGuestDisplayName,
  updateReservationPosition,
  updateReservationDuration,
  checkTimeConflict,
  timeToMinutes,
  minutesToTime,
  GridTimeConfig,
  defaultGridConfig,
} from "@/data/reservations";
import { TableRow, STICKY_COL_WIDTH } from "./TableRow";
import { useToast } from "@/hooks/use-toast";

interface ReservationGridViewProps {
  selectedDate: Date;
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
  config?: GridTimeConfig;
}

// Grid lines component - renders vertical lines for hours and quarter hours
function GridLines({ config }: { config: GridTimeConfig }) {
  const hours = useMemo(() => {
    const result = [];
    for (let h = config.startHour; h <= config.endHour; h++) {
      result.push(h);
    }
    return result;
  }, [config.startHour, config.endHour]);

  const hourWidth = 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;

  return (
    <div 
      className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none"
      style={{ left: `${STICKY_COL_WIDTH}px` }}
    >
      {hours.map((hour, hourIndex) => (
        <div key={hour} className="absolute top-0 bottom-0">
          {/* Hour line - darker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${hourIndex * hourWidth}px` }}
          />
          {/* Quarter hour lines - more visible */}
          {[1, 2, 3].map((q) => (
            <div
              key={q}
              className="absolute top-0 bottom-0 w-px bg-border/50"
              style={{ left: `${hourIndex * hourWidth + q * quarterWidth}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Timeline header with hour labels centered on lines (Formitable-style)
function TimelineHeader({ config }: { config: GridTimeConfig }) {
  const hourLabels = useMemo(() => getHourLabels(config), [config]);
  const hourWidth = 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;
  const totalWidth = hourLabels.length * hourWidth;

  return (
    <div className="sticky top-0 z-20 flex border-b-2 border-border bg-card">
      {/* Empty cell for table column */}
      <div 
        className="sticky left-0 z-30 flex-shrink-0 bg-card border-r-2 border-border h-10"
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      />
      
      {/* Timeline with quarter lines and centered hour labels */}
      <div className="relative h-10" style={{ width: `${totalWidth}px` }}>
        {/* Quarter hour vertical lines */}
        {hourLabels.map((_, hourIndex) => (
          <div key={hourIndex} className="absolute top-0 bottom-0">
            {/* Hour line (thicker) */}
            <div
              className="absolute top-0 bottom-0 w-px bg-border"
              style={{ left: `${hourIndex * hourWidth}px` }}
            />
            {/* Quarter lines (visible but lighter) */}
            {[1, 2, 3].map((q) => (
              <div
                key={q}
                className="absolute top-0 bottom-0 w-px bg-border/50"
                style={{ left: `${hourIndex * hourWidth + q * quarterWidth}px` }}
              />
            ))}
          </div>
        ))}
        
        {/* Hour labels - centered on the hour lines */}
        {hourLabels.map((hour, index) => (
          <div
            key={hour}
            className="absolute top-0 h-10 flex items-center justify-center"
            style={{ 
              left: `${index * hourWidth}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <span className="text-sm font-semibold text-muted-foreground bg-card px-1.5">
              {hour}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Seated count row
function SeatedCountRow({
  date,
  config,
  isExpanded,
  onToggle,
}: {
  date: string;
  config: GridTimeConfig;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hourLabels = useMemo(() => getHourLabels(config), [config]);
  const quarterWidth = 15 * config.pixelsPerMinute;

  // Generate 15-minute intervals for each hour
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

  const seatedCounts = useMemo(() => {
    return quarterSlots.map((time) => getSeatedCountAtTime(date, time));
  }, [date, quarterSlots]);

  return (
    <div className="flex border-b border-border bg-secondary">
      {/* Label cell */}
      <div 
        className="sticky left-0 z-30 flex-shrink-0 flex items-center justify-between px-3 py-2 bg-secondary border-r-2 border-border"
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        <span className="text-xs font-semibold text-muted-foreground">Seated</span>
        <button
          onClick={onToggle}
          className="p-0.5 hover:bg-muted rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      
      {/* Seated counts per 15 minutes */}
      <div className="flex">
        {seatedCounts.map((count, index) => (
          <div
            key={index}
            className={cn(
              "text-xs font-semibold flex items-center justify-center py-2",
              index % 4 === 0 ? "border-l border-border" : "border-l border-border/50",
              index === 0 && "border-l-0"
            )}
            style={{ width: `${quarterWidth}px` }}
          >
            <span
              className={cn(
                count > 0 && "text-foreground font-bold",
                count === 0 && "text-muted-foreground"
              )}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Zone header
function ZoneHeader({ name }: { name: string }) {
  return (
    <div className="flex bg-secondary border-b border-t border-border h-8">
      {/* Sticky zone label - blijft altijd zichtbaar bij horizontaal scrollen */}
      <div 
        className="sticky left-0 z-30 flex-shrink-0 bg-secondary border-r-2 border-border flex items-center px-3"
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        <span className="text-xs font-bold text-foreground uppercase tracking-wide whitespace-nowrap">
          {name}
        </span>
      </div>
      
      {/* Rest van de rij (leeg, alleen voor grid-achtergrond) */}
      <div className="flex-1" />
    </div>
  );
}

// Now indicator line - real-time red vertical line
function NowIndicator({ config }: { config: GridTimeConfig }) {
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const gridStartMinutes = config.startHour * 60;
      const gridEndMinutes = config.endHour * 60;

      if (currentTimeMinutes >= gridStartMinutes && currentTimeMinutes < gridEndMinutes) {
        const offset = (currentTimeMinutes - gridStartMinutes) * config.pixelsPerMinute;
        setPosition(offset);
      } else {
        setPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [config]);

  if (position === null) return null;

  const leftPos = STICKY_COL_WIDTH + position;

  return (
    <>
      {/* Subtle highlight band behind the line */}
      <div
        className="absolute top-0 bottom-0 bg-destructive/8 pointer-events-none z-10"
        style={{ 
          left: `${leftPos - 3}px`,
          width: '6px'
        }}
      />
      {/* Main red line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-destructive z-30 pointer-events-none"
        style={{ left: `${leftPos}px` }}
      >
        {/* NU label at top - sticky */}
        <div className="sticky top-1 -translate-x-1/2 w-fit">
          <div className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
            NU
          </div>
        </div>
      </div>
    </>
  );
}

// Drag overlay component - shows ghost of dragged reservation
function DraggedReservationOverlay({ reservation }: { reservation: Reservation }) {
  const guestName = getGuestDisplayName(reservation);
  
  return (
    <div className="bg-primary/20 border-2 border-primary rounded-md px-3 py-2 shadow-xl flex items-center gap-2 text-sm cursor-grabbing">
      <span className="font-bold">{reservation.guests}</span>
      <span className="truncate">{guestName}</span>
    </div>
  );
}

export function ReservationGridView({
  selectedDate,
  reservations,
  onReservationClick,
  config = defaultGridConfig,
}: ReservationGridViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [seatedExpanded, setSeatedExpanded] = useState(true);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [, forceUpdate] = useState(0);
  const { toast } = useToast();
  
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const zones = useMemo(() => getActiveZones(), []);
  
  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  const totalWidth = STICKY_COL_WIDTH + gridWidth;

  // Scroll to current time on mount
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const gridStartMinutes = config.startHour * 60;

      if (currentTimeMinutes >= gridStartMinutes) {
        const scrollPosition = (currentTimeMinutes - gridStartMinutes) * config.pixelsPerMinute - 200;
        containerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [config]);

  // Calculate time from drop position
  const calculateTimeFromX = useCallback((x: number): string => {
    // Snap to 15-minute intervals
    const minutesFromStart = Math.round(x / config.pixelsPerMinute / 15) * 15;
    const totalMinutes = config.startHour * 60 + minutesFromStart;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const displayHour = hours >= 24 ? hours - 24 : hours;
    return `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, [config]);

  // Handle drag end with collision detection
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveReservation(null);

    if (!over || !active.data.current?.reservation) return;

    const reservation = active.data.current.reservation as Reservation;
    const targetTableId = over.data.current?.tableId as string;

    if (!targetTableId) return;

    // Calculate new start time based on drag delta and original position
    const [startH, startM] = reservation.startTime.split(':').map(Number);
    const originalMinutesFromGridStart = (startH * 60 + startM) - config.startHour * 60;
    const originalX = originalMinutesFromGridStart * config.pixelsPerMinute;
    const newX = Math.max(0, originalX + delta.x);
    const newStartTime = calculateTimeFromX(newX);

    // Check if anything changed
    const isSameTable = reservation.tableIds.includes(targetTableId);
    const isSameTime = newStartTime === reservation.startTime;

    if (isSameTable && isSameTime) return;

    // Calculate new end time
    const durationMinutes = timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime);
    const newEndTime = minutesToTime(timeToMinutes(newStartTime) + durationMinutes);

    // Check for collision BEFORE updating
    const conflict = checkTimeConflict(
      targetTableId,
      reservation.date,
      newStartTime,
      newEndTime,
      reservation.id
    );

    if (conflict.hasConflict) {
      toast({
        title: "Conflict gedetecteerd",
        description: `Overlapt met reservering van ${getGuestDisplayName(conflict.conflictingReservation!)} (${conflict.conflictingReservation!.startTime} - ${conflict.conflictingReservation!.endTime})`,
        variant: "destructive",
      });
      return; // Block the move
    }

    // Update reservation
    const updated = updateReservationPosition(reservation.id, targetTableId, newStartTime);
    
    if (updated) {
      toast({
        title: "Reservering verplaatst",
        description: `${getGuestDisplayName(reservation)} verplaatst naar tafel ${over.data.current?.tableId?.replace('table-', '')} om ${newStartTime}`,
      });
      // Force re-render to show updated positions
      forceUpdate(n => n + 1);
    }
  }, [config, calculateTimeFromX, toast]);

  // Handle resize with collision detection
  const handleResize = useCallback((
    reservationId: string,
    newStartTime: string,
    newEndTime: string
  ): boolean => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return false;

    const tableId = reservation.tableIds[0];

    // Validate minimum duration (15 minutes)
    const startMins = timeToMinutes(newStartTime);
    const endMins = timeToMinutes(newEndTime);
    if (endMins - startMins < 15) {
      toast({
        title: "Te kort",
        description: "Minimale duur is 15 minuten",
        variant: "destructive",
      });
      return false;
    }

    // Check for collision
    const conflict = checkTimeConflict(
      tableId,
      reservation.date,
      newStartTime,
      newEndTime,
      reservationId
    );

    if (conflict.hasConflict) {
      toast({
        title: "Conflict gedetecteerd",
        description: `Overlapt met reservering van ${getGuestDisplayName(conflict.conflictingReservation!)} (${conflict.conflictingReservation!.startTime} - ${conflict.conflictingReservation!.endTime})`,
        variant: "destructive",
      });
      return false;
    }

    // Update reservation
    updateReservationDuration(reservationId, newStartTime, newEndTime);
    
    toast({
      title: "Duur aangepast",
      description: `${getGuestDisplayName(reservation)} nu van ${newStartTime} tot ${newEndTime}`,
    });
    
    forceUpdate(n => n + 1);
    return true;
  }, [reservations, toast]);

  const handleDragStart = useCallback((event: { active: { data: { current?: { reservation?: Reservation } } } }) => {
    if (event.active.data.current?.reservation) {
      setActiveReservation(event.active.data.current.reservation);
    }
  }, []);

  return (
    <DndContext 
      onDragEnd={handleDragEnd} 
      onDragStart={handleDragStart}
      collisionDetection={pointerWithin}
    >
      <div className="relative h-full overflow-hidden border border-border rounded-lg bg-card">
        <div
          ref={containerRef}
          className="h-full overflow-auto"
        >
          <div className="min-w-max relative" style={{ minWidth: `${totalWidth}px` }}>
            {/* Grid lines - behind everything */}
            <GridLines config={config} />

            {/* Now indicator - above grid lines, below content */}
            <NowIndicator config={config} />

            {/* Timeline header - sticky top */}
            <TimelineHeader config={config} />

            {/* Seated count row */}
            <SeatedCountRow
              date={dateString}
              config={config}
              isExpanded={seatedExpanded}
              onToggle={() => setSeatedExpanded(!seatedExpanded)}
            />

            {/* Zones with tables */}
            {zones.map((zone) => {
              const tables = getTablesByZone(zone.id);
              if (tables.length === 0) return null;

              return (
                <div key={zone.id}>
                  {/* Zone header */}
                  <ZoneHeader name={zone.name} />

                  {/* Table rows */}
                  {tables.map((table, index) => (
                    <TableRow
                      key={table.id}
                      table={table}
                      date={dateString}
                      config={config}
                      onReservationClick={onReservationClick}
                      onReservationResize={handleResize}
                      isOdd={index % 2 === 1}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Drag overlay */}
      <DragOverlay>
        {activeReservation ? (
          <DraggedReservationOverlay reservation={activeReservation} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
