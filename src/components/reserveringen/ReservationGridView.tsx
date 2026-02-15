import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent, pointerWithin, useSensor, useSensors, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { DensityType } from "./DensityToggle";

// Ghost position type for drag preview
interface GhostPosition {
  tableId: string;
  startTime: string;
  endTime: string;
  left: number;        // Exact cursor position (smooth)
  snappedLeft: number; // Where it will snap to
  width: number;
  topOffset: number;
}
import {
  Reservation,
  getActiveZones,
  getTablesByZone,
  getSeatedCountAtTime,
  getHourLabels,
  getGuestDisplayName,
  updateReservationPosition,
  updateReservationDuration,
  checkInReservation,
  checkTimeConflict,
  timeToMinutes,
  minutesToTime,
  getPacingLimitForTime,
  GridTimeConfig,
  defaultGridConfig,
  addReservation,
  getShiftForTime,
  getReservationsForDate,
  getTableById,
} from "@/data/reservations";
import { TableRow, STICKY_COL_WIDTH } from "./TableRow";
import { nestoToast } from "@/lib/nestoToast";
import { QuickReservationPanel } from "./QuickReservationPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReservationGridViewProps {
  selectedDate: Date;
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
  onReservationUpdate?: () => void;
  config?: GridTimeConfig;
  density?: DensityType;
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
// Helper function to get occupancy color based on pacing limit
function getOccupancyColor(count: number, limit: number): string {
  if (count === 0) return "text-muted-foreground";
  const percentage = (count / limit) * 100;
  if (percentage <= 70) return "text-success font-bold";
  if (percentage <= 100) return "text-warning font-bold";
  return "text-destructive font-bold";
}

function SeatedCountRow({
  date,
  config,
  isExpanded,
  onToggle,
  onSlotClick,
  isCompact = false,
}: {
  date: string;
  config: GridTimeConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onSlotClick?: (time: string) => void;
  isCompact?: boolean;
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

  const seatedData = useMemo(() => {
    return quarterSlots.map((time) => ({
      time,
      count: getSeatedCountAtTime(date, time),
      limit: getPacingLimitForTime(time),
    }));
  }, [date, quarterSlots]);

  return (
    <div className="flex border-b-2 border-border bg-secondary sticky top-[40px] z-20">
      {/* Label cell */}
      <div 
        className={cn("sticky left-0 z-30 flex-shrink-0 flex items-center justify-between px-3 bg-secondary border-r-2 border-border", isCompact ? "py-1" : "py-2")}
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        <span className="text-xs font-semibold text-muted-foreground">Pacing</span>
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
      
      {/* Seated counts per 15 minutes with tooltips - clickable */}
      <div className="flex">
        {seatedData.map(({ time, count, limit }, index) => {
          const percentage = limit > 0 ? Math.round((count / limit) * 100) : 0;
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => onSlotClick?.(time)}
                    className={cn(
                      "text-caption flex items-center justify-center py-2 cursor-pointer transition-colors hover:bg-primary/10",
                    index % 4 === 0 ? "border-l border-border" : "border-l border-border/50",
                    index === 0 && "border-l-0"
                  )}
                  style={{ width: `${quarterWidth}px` }}
                >
                  <span className={getOccupancyColor(count, limit)}>
                    {count}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span className="font-semibold">{time}</span>
                <br />
                {count}/{limit} gasten ({percentage}%)
                <br />
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
      <div 
        className="sticky left-0 z-30 flex-shrink-0 bg-secondary border-r-2 border-border flex items-center px-3"
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        <span className="text-xs font-bold text-foreground uppercase tracking-wide whitespace-nowrap">
          {name}
        </span>
      </div>
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
          <div className="bg-destructive text-destructive-foreground text-caption font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
            NU
          </div>
        </div>
      </div>
    </>
  );
}

// Ghost preview component - GPU accelerated with smooth cursor following + drop animation
function GhostPreview({ 
  position, 
  hasConflict,
  guestCount,
  isDropAnimating = false,
  finalDropPosition,
}: { 
  position: GhostPosition;
  hasConflict: boolean;
  guestCount: number;
  isDropAnimating?: boolean;
  finalDropPosition?: GhostPosition | null;
}) {
  // Use final position during drop animation, otherwise use current position
  const displayPosition = isDropAnimating && finalDropPosition ? finalDropPosition : position;
  
  return (
    <div
      className={cn(
        "absolute rounded-md pointer-events-none will-change-transform",
        "shadow-xl",
        hasConflict 
          ? "bg-destructive/70 border-2 border-destructive" 
          : "bg-primary/70 border-2 border-primary",
        // Fade out during drop animation
        isDropAnimating && "opacity-0"
      )}
      style={{
        // Use snappedLeft for direct grid alignment - precise snapping
        transform: `translate3d(${STICKY_COL_WIDTH + displayPosition.snappedLeft}px, ${displayPosition.topOffset}px, 0)`,
        width: `${displayPosition.width}px`,
        height: '36px',
        zIndex: 50,
        left: 0,
        top: 0,
        // During drop: settle to final position then fade out
        // Normal: subtle transition for smooth snap feeling
        transition: isDropAnimating 
          ? 'transform 100ms ease-out, opacity 150ms ease-out 100ms' 
          : 'transform 50ms ease-out',
      }}
    >
      <div className="flex items-center justify-between h-full px-2.5">
        <span className={cn(
          "font-bold text-sm",
          hasConflict ? "text-destructive-foreground" : "text-primary-foreground"
        )}>
          {guestCount}p
        </span>
        <span className={cn(
          "text-xs font-medium",
          hasConflict ? "text-destructive-foreground" : "text-primary-foreground"
        )}>
          {displayPosition.startTime}
        </span>
      </div>
    </div>
  );
}

export function ReservationGridView({
  selectedDate,
  reservations,
  onReservationClick,
  onReservationUpdate,
  config = defaultGridConfig,
  density = "compact",
}: ReservationGridViewProps) {
  const isCompact = density === "compact";
  const containerRef = useRef<HTMLDivElement>(null);
  const [seatedExpanded, setSeatedExpanded] = useState(true);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  
  // Drop animation states
  const [isDropAnimating, setIsDropAnimating] = useState(false);
  const [finalDropPosition, setFinalDropPosition] = useState<GhostPosition | null>(null);
  const [animatingReservationId, setAnimatingReservationId] = useState<string | null>(null);
  
  
  // Quick reservation panel state
  const [quickReservationOpen, setQuickReservationOpen] = useState(false);
  const [quickReservationTime, setQuickReservationTime] = useState<string | null>(null);
  const [quickReservationTableId, setQuickReservationTableId] = useState<string | null>(null);
  
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const zones = useMemo(() => getActiveZones(), []);
  
  // Fetch reservations directly from data source, refreshing when localRefreshKey changes
  const currentReservations = useMemo(() => {
    return getReservationsForDate(dateString);
  }, [dateString, localRefreshKey]);
  
  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  const totalWidth = STICKY_COL_WIDTH + gridWidth;

  // Row heights for table position calculation - MUST MATCH CSS
  const HEADER_HEIGHT = 40;
  const SEATED_ROW_HEIGHT = isCompact ? 36 : 44;
  const ZONE_HEADER_HEIGHT = isCompact ? 28 : 32;
  const TABLE_ROW_HEIGHT = isCompact ? 36 : 56;

  const tablePositions = useMemo(() => {
    const positions: Record<string, number> = {};
    let currentTop = HEADER_HEIGHT + SEATED_ROW_HEIGHT;
    
    zones.forEach(zone => {
      const tables = getTablesByZone(zone.id);
      if (tables.length === 0) return;
      
      currentTop += ZONE_HEADER_HEIGHT;
      tables.forEach(table => {
        const ghostHeight = isCompact ? 28 : 36;
        const verticalOffset = (TABLE_ROW_HEIGHT - ghostHeight) / 2;
        positions[table.id] = currentTop + verticalOffset;
        currentTop += TABLE_ROW_HEIGHT;
      });
    });
    
    return positions;
  }, [zones, isCompact, HEADER_HEIGHT, SEATED_ROW_HEIGHT, ZONE_HEADER_HEIGHT, TABLE_ROW_HEIGHT]);

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

  // Handle drag move - ghost follows cursor exactly, snap indicator shows landing
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, over, delta } = event;
    
    if (!over || !active.data.current?.reservation) {
      setGhostPosition(null);
      return;
    }

    const reservation = active.data.current.reservation as Reservation;
    const targetTableId = over.data.current?.tableId as string;
    
    if (!targetTableId || !tablePositions[targetTableId]) {
      setGhostPosition(null);
      return;
    }

    // Calculate from original position + delta
    const durationMinutes = timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime);
    const reservationWidth = durationMinutes * config.pixelsPerMinute;
    const originalStartMinutes = timeToMinutes(reservation.startTime) - config.startHour * 60;
    const originalLeft = originalStartMinutes * config.pixelsPerMinute;
    const maxLeft = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute - reservationWidth;
    
    // Ghost follows cursor EXACTLY (smooth, no snapping)
    const exactLeft = originalLeft + (delta?.x || 0);
    const clampedLeft = Math.max(0, Math.min(exactLeft, maxLeft));
    
    // Calculate where it WOULD snap (for indicator)
    const snappedMinutes = Math.round(clampedLeft / config.pixelsPerMinute / 15) * 15;
    const clampedMinutes = Math.max(0, Math.min(snappedMinutes, (config.endHour - config.startHour) * 60 - durationMinutes));
    const snappedLeft = clampedMinutes * config.pixelsPerMinute;
    
    const newStartTime = minutesToTime(config.startHour * 60 + clampedMinutes);
    const newEndTime = minutesToTime(timeToMinutes(newStartTime) + durationMinutes);

    setGhostPosition({
      tableId: targetTableId,
      startTime: newStartTime,
      endTime: newEndTime,
      left: clampedLeft,        // Exact cursor position (smooth)
      snappedLeft: snappedLeft, // Where it will snap
      width: reservationWidth,
      topOffset: tablePositions[targetTableId],
    });
  }, [config, tablePositions]);

  // Check if ghost has conflict
  const ghostHasConflict = useMemo(() => {
    if (!ghostPosition || !activeReservation) return false;
    
    const conflict = checkTimeConflict(
      ghostPosition.tableId,
      dateString,
      ghostPosition.startTime,
      ghostPosition.endTime,
      activeReservation.id
    );
    
    return conflict.hasConflict;
  }, [ghostPosition, dateString, activeReservation]);

  // Handle drag end - use same delta-based calculation as handleDragMove with smooth drop animation
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (!over || !active.data.current?.reservation) {
      // Cancel drag - just reset states
      setActiveReservation(null);
      setGhostPosition(null);
      return;
    }

    const reservation = active.data.current.reservation as Reservation;
    const targetTableId = over.data.current?.tableId as string;

    if (!targetTableId) {
      setActiveReservation(null);
      setGhostPosition(null);
      return;
    }

    // Use same calculation as handleDragMove for consistency
    const durationMinutes = timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime);
    const reservationWidth = durationMinutes * config.pixelsPerMinute;
    const originalStartMinutes = timeToMinutes(reservation.startTime) - config.startHour * 60;
    const originalLeft = originalStartMinutes * config.pixelsPerMinute;
    const newLeft = originalLeft + (delta?.x || 0);
    
    // Snap to 15-minute intervals
    const snappedMinutes = Math.round(newLeft / config.pixelsPerMinute / 15) * 15;
    const clampedMinutes = Math.max(0, Math.min(snappedMinutes, (config.endHour - config.startHour) * 60 - durationMinutes));
    const snappedLeft = clampedMinutes * config.pixelsPerMinute;
    const newStartTime = minutesToTime(config.startHour * 60 + clampedMinutes);
    const newEndTime = minutesToTime(timeToMinutes(newStartTime) + durationMinutes);

    // Check if anything changed
    const isSameTable = reservation.tableIds.includes(targetTableId);
    const isSameTime = newStartTime === reservation.startTime;

    if (isSameTable && isSameTime) {
      setActiveReservation(null);
      setGhostPosition(null);
      return;
    }

    // Check for collision BEFORE updating
    const conflict = checkTimeConflict(
      targetTableId,
      reservation.date,
      newStartTime,
      newEndTime,
      reservation.id
    );

    if (conflict.hasConflict) {
      nestoToast.error("Conflict gedetecteerd", `Overlapt met reservering van ${getGuestDisplayName(conflict.conflictingReservation!)} (${conflict.conflictingReservation!.startTime} - ${conflict.conflictingReservation!.endTime})`);
      setActiveReservation(null);
      setGhostPosition(null);
      return;
    }

    // Update reservation data
    const updated = updateReservationPosition(reservation.id, targetTableId, newStartTime);
    
    if (updated) {
      // Remember which reservation is being animated
      setAnimatingReservationId(reservation.id);
      
      // Start drop animation - ghost settles to final position then fades out
      setFinalDropPosition({
        tableId: targetTableId,
        startTime: newStartTime,
        endTime: newEndTime,
        left: snappedLeft,
        snappedLeft: snappedLeft,
        width: reservationWidth,
        topOffset: tablePositions[targetTableId] || 0,
      });
      setIsDropAnimating(true);
      
      // Phase 1 (0-100ms): Ghost settles to snap position
      // Phase 2 (100-250ms): Ghost fades out while new data appears
      setTimeout(() => {
        // Refresh data to show new position
        setLocalRefreshKey(k => k + 1);
        
        // After fade-out completes, cleanup
        setTimeout(() => {
          setActiveReservation(null);
          setGhostPosition(null);
          setFinalDropPosition(null);
          setIsDropAnimating(false);
          setAnimatingReservationId(null);
        }, 150);
      }, 100);

      nestoToast.success("Reservering verplaatst", `${getGuestDisplayName(reservation)} verplaatst naar tafel ${over.data.current?.tableId?.replace('table-', '')} om ${newStartTime}`);
      onReservationUpdate?.();
    } else {
      setActiveReservation(null);
      setGhostPosition(null);
    }
  }, [config, onReservationUpdate, tablePositions]);

  // Handle resize with collision detection
  const handleResize = useCallback((
    reservationId: string,
    newStartTime: string,
    newEndTime: string
  ): boolean => {
    const reservation = currentReservations.find(r => r.id === reservationId);
    if (!reservation) return false;

    const tableId = reservation.tableIds[0];

    // Validate minimum duration (15 minutes)
    const startMins = timeToMinutes(newStartTime);
    const endMins = timeToMinutes(newEndTime);
    if (endMins - startMins < 15) {
      nestoToast.error("Te kort", "Minimale duur is 15 minuten");
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
      nestoToast.error("Conflict gedetecteerd", `Overlapt met reservering van ${getGuestDisplayName(conflict.conflictingReservation!)} (${conflict.conflictingReservation!.startTime} - ${conflict.conflictingReservation!.endTime})`);
      return false;
    }

    // Update reservation
    updateReservationDuration(reservationId, newStartTime, newEndTime);
    
    nestoToast.success("Duur aangepast", `${getGuestDisplayName(reservation)} nu van ${newStartTime} tot ${newEndTime}`);
    
    onReservationUpdate?.();
    setLocalRefreshKey(k => k + 1);
    return true;
  }, [reservations, onReservationUpdate]);

  // Handle check-in (double-click or long-press) - moves reservation to current time
  const handleCheckIn = useCallback((reservation: Reservation) => {
    const updated = checkInReservation(reservation.id, true); // moveToNow = true
    
    if (updated) {
      setLocalRefreshKey(k => k + 1);
      const tableNumber = getTableById(reservation.tableIds[0])?.number || reservation.tableIds[0];
      const timeMoved = updated.startTime !== reservation.startTime;
      
      nestoToast.success(`${getGuestDisplayName(reservation)} is ingecheckt`, timeMoved 
          ? `Tafel ${tableNumber} - ${reservation.guests} gasten - Verplaatst naar ${updated.startTime}`
          : `Tafel ${tableNumber} - ${reservation.guests} gasten`);
      onReservationUpdate?.();
    }
  }, [onReservationUpdate]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.reservation) {
      const reservation = event.active.data.current.reservation as Reservation;
      setActiveReservation(reservation);
      
      // Initialize ghost immediately at the original position to prevent "fly-in" effect
      const tableId = reservation.tableIds[0];
      if (tableId && tablePositions[tableId] !== undefined) {
        const durationMinutes = timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime);
        const reservationWidth = durationMinutes * config.pixelsPerMinute;
        const startMinutes = timeToMinutes(reservation.startTime) - config.startHour * 60;
        const startLeft = startMinutes * config.pixelsPerMinute;
        
        setGhostPosition({
          tableId: tableId,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          left: startLeft,
          snappedLeft: startLeft,
          width: reservationWidth,
          topOffset: tablePositions[tableId],
        });
      }
    }
  }, [tablePositions, config]);

  // Sensors for desktop (pointer) and mobile/tablet (touch)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Start drag after 5px movement
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,    // Hold 200ms before drag starts
        tolerance: 5,  // Allow 5px movement during delay
      },
    })
  );

  // Handle slot click to open quick reservation panel (from pacing row)
  const handleSlotClick = useCallback((time: string) => {
    setQuickReservationTime(time);
    setQuickReservationTableId(null); // No table preselected from pacing row
    setQuickReservationOpen(true);
  }, []);

  // Handle empty slot click in table row
  const handleEmptySlotClick = useCallback((tableId: string, time: string) => {
    setQuickReservationTime(time);
    setQuickReservationTableId(tableId);
    setQuickReservationOpen(true);
  }, []);

  // Handle quick reservation submit
  const handleQuickReservationSubmit = useCallback((data: {
    guestName: string;
    time: string;
    guests: number;
    tableId: string;
    duration: number;
    notes?: string;
    isWalkIn: boolean;
  }) => {
    const endTime = minutesToTime(timeToMinutes(data.time) + data.duration);
    
    addReservation({
      guestFirstName: data.isWalkIn ? '' : data.guestName.split(' ')[0] || '',
      guestLastName: data.isWalkIn ? '' : data.guestName.split(' ').slice(1).join(' ') || '',
      salutation: '',
      phone: '',
      email: '',
      countryCode: 'NL',
      date: dateString,
      startTime: data.time,
      endTime,
      guests: data.guests,
      tableIds: [data.tableId],
      shift: getShiftForTime(data.time),
      status: data.isWalkIn ? 'seated' : 'confirmed',
      notes: data.notes || '',
      isVip: false,
      isWalkIn: data.isWalkIn,
      ticketType: '',
    });

    nestoToast.success(data.isWalkIn ? "Walk-in toegevoegd" : "Reservering aangemaakt", `${data.isWalkIn ? 'Walk-in' : data.guestName} om ${data.time} voor ${data.guests} gasten`);

    onReservationUpdate?.();
    setLocalRefreshKey(k => k + 1);
  }, [dateString, onReservationUpdate]);

  return (
    <DndContext 
      sensors={sensors}
      onDragEnd={handleDragEnd} 
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
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

            {/* Seated count row - clickable to add reservation */}
            <SeatedCountRow
              date={dateString}
              config={config}
              isExpanded={seatedExpanded}
              onToggle={() => setSeatedExpanded(!seatedExpanded)}
              onSlotClick={handleSlotClick}
              isCompact={isCompact}
            />

            {/* Zones with tables */}
            {zones.map((zone) => {
              const tables = getTablesByZone(zone.id);
              if (tables.length === 0) return null;

              return (
                <div key={zone.id}>
                  {/* Zone header */}
                  <ZoneHeader name={zone.name} isCompact={isCompact} />

                  {/* Table rows */}
                  {tables.map((table, index) => (
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
                      refreshKey={localRefreshKey}
                      isDropAnimating={isDropAnimating}
                      density={density}
                    />
                  ))}
                </div>
              );
            })}

            {/* Ghost preview - shows where reservation will land */}
            {(ghostPosition || isDropAnimating) && (activeReservation || finalDropPosition) && (
              <GhostPreview 
                position={ghostPosition || finalDropPosition!}
                hasConflict={ghostHasConflict}
                guestCount={activeReservation?.guests || 0}
                isDropAnimating={isDropAnimating}
                finalDropPosition={finalDropPosition}
              />
            )}
          </div>
        </div>
      </div>

      {/* Quick reservation panel */}
      <QuickReservationPanel
        open={quickReservationOpen}
        onOpenChange={(open) => {
          setQuickReservationOpen(open);
          if (!open) setQuickReservationTableId(null);
        }}
        initialTime={quickReservationTime}
        initialTableId={quickReservationTableId}
        date={dateString}
        onSubmit={handleQuickReservationSubmit}
      />
    </DndContext>
  );
}
