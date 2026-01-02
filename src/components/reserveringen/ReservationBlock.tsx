import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Phone, Star, UserCheck, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Reservation,
  getGuestDisplayName,
  calculateBlockPosition,
  timeToMinutes,
  minutesToTime,
  GridTimeConfig,
  defaultGridConfig,
} from "@/data/reservations";

interface ReservationBlockProps {
  reservation: Reservation;
  config?: GridTimeConfig;
  onClick?: (reservation: Reservation) => void;
  onResize?: (reservationId: string, newStartTime: string, newEndTime: string) => boolean;
}

export function ReservationBlock({
  reservation,
  config = defaultGridConfig,
  onClick,
  onResize,
}: ReservationBlockProps) {
  const position = useMemo(
    () => calculateBlockPosition(reservation.startTime, reservation.endTime, config),
    [reservation.startTime, reservation.endTime, config]
  );

  const guestName = getGuestDisplayName(reservation);

  // Resize state
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeDelta, setResizeDelta] = useState(0);
  const startPosRef = useRef({ x: 0, originalStart: 0, originalWidth: 0 });

  // Make it draggable (but not while resizing)
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: reservation.id,
    data: { reservation },
    disabled: isResizing !== null,
  });

  // Status-based styling
  const getBlockStyles = () => {
    switch (reservation.status) {
      case "seated":
      case "checked_in":
        return "bg-emerald-100 border-emerald-400 dark:bg-emerald-900/40 dark:border-emerald-600";
      case "confirmed":
        return "bg-primary/15 border-primary/50";
      case "pending":
        return "bg-muted border-border";
      case "cancelled":
        return "bg-destructive/10 border-destructive/30 opacity-50";
      case "no_show":
        return "bg-orange-100 border-orange-300 opacity-60 dark:bg-orange-900/30 dark:border-orange-600";
      case "completed":
        return "bg-muted/50 border-border/50 opacity-60";
      default:
        return "bg-muted border-border";
    }
  };

  const isClickable = reservation.status !== "cancelled" && reservation.status !== "completed";
  const canResize = isClickable && onResize;

  // Calculate snapped time from pixel delta
  const calculateNewTimes = useCallback((side: 'left' | 'right', delta: number) => {
    const startMinutes = timeToMinutes(reservation.startTime);
    const endMinutes = timeToMinutes(reservation.endTime);
    const minutesDelta = Math.round(delta / config.pixelsPerMinute / 15) * 15; // Snap to 15 min

    if (side === 'left') {
      const newStart = startMinutes + minutesDelta;
      // Ensure minimum 15 minute duration
      if (endMinutes - newStart < 15) return null;
      // Ensure doesn't go before grid start
      if (newStart < config.startHour * 60) return null;
      return {
        newStartTime: minutesToTime(newStart),
        newEndTime: reservation.endTime,
      };
    } else {
      const newEnd = endMinutes + minutesDelta;
      // Ensure minimum 15 minute duration
      if (newEnd - startMinutes < 15) return null;
      // Ensure doesn't go past grid end
      if (newEnd > config.endHour * 60) return null;
      return {
        newStartTime: reservation.startTime,
        newEndTime: minutesToTime(newEnd),
      };
    }
  }, [reservation.startTime, reservation.endTime, config]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(side);
    setResizeDelta(0);
    startPosRef.current = {
      x: e.clientX,
      originalStart: position.left,
      originalWidth: position.width,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startPosRef.current.x;
      setResizeDelta(delta);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const finalDelta = upEvent.clientX - startPosRef.current.x;
      const newTimes = calculateNewTimes(side, finalDelta);
      
      if (newTimes && onResize) {
        onResize(reservation.id, newTimes.newStartTime, newTimes.newEndTime);
      }
      
      setIsResizing(null);
      setResizeDelta(0);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position.left, position.width, calculateNewTimes, onResize, reservation.id]);

  // Calculate display position during resize
  const displayPosition = useMemo(() => {
    if (!isResizing) return position;

    if (isResizing === 'left') {
      const snappedDelta = Math.round(resizeDelta / config.pixelsPerMinute / 15) * 15 * config.pixelsPerMinute;
      return {
        left: position.left + snappedDelta,
        width: Math.max(position.width - snappedDelta, 15 * config.pixelsPerMinute),
      };
    } else {
      const snappedDelta = Math.round(resizeDelta / config.pixelsPerMinute / 15) * 15 * config.pixelsPerMinute;
      return {
        left: position.left,
        width: Math.max(position.width + snappedDelta, 15 * config.pixelsPerMinute),
      };
    }
  }, [position, isResizing, resizeDelta, config.pixelsPerMinute]);

  const style = {
    left: `${displayPosition.left}px`,
    width: `${Math.max(displayPosition.width - 4, 50)}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...(isResizing ? {} : listeners)}
      {...(isResizing ? {} : attributes)}
      className={cn(
        "absolute top-1.5 bottom-1.5 rounded-md border-[1.5px] flex items-center gap-1.5 text-xs overflow-hidden transition-shadow select-none group",
        getBlockStyles(),
        isClickable && !isResizing && "cursor-grab hover:shadow-lg hover:scale-[1.02] hover:z-20",
        isDragging && "opacity-50 cursor-grabbing z-50 shadow-xl",
        isResizing && "z-50 shadow-xl ring-2 ring-primary"
      )}
      style={style}
      onClick={(e) => {
        if (!isDragging && !isResizing && isClickable) {
          e.stopPropagation();
          onClick?.(reservation);
        }
      }}
      title={`${guestName} - ${reservation.guests}p - ${reservation.startTime}-${reservation.endTime}`}
    >
      {/* Left resize handle */}
      {canResize && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 rounded-l-md z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        />
      )}

      {/* Content with horizontal padding to account for resize handles */}
      <div className="flex items-center gap-1.5 px-2.5 min-w-0 flex-1">
        {/* Seated/Walk-in icon */}
        {reservation.isWalkIn ? (
          <Footprints className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : reservation.status === "seated" || reservation.status === "checked_in" ? (
          <UserCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
        ) : null}

        {/* Guest count - prominent */}
        <span className="text-foreground font-bold flex-shrink-0 text-sm">
          {reservation.guests}
        </span>

        {/* Guest name - truncated */}
        <span className="truncate text-foreground/80 font-medium min-w-0 text-xs">
          {guestName}
        </span>

        {/* VIP indicator */}
        {reservation.isVip && (
          <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
        )}

        {/* Phone indicator */}
        {reservation.phone && !reservation.isWalkIn && displayPosition.width > 100 && (
          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}

        {/* Shift badge - only show if there's enough space */}
        {displayPosition.width > 140 && (
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ml-auto",
              reservation.shift === "ED"
                ? "bg-primary/20 text-primary"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
            )}
          >
            {reservation.shift}
          </span>
        )}
      </div>

      {/* Right resize handle */}
      {canResize && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 rounded-r-md z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        />
      )}
    </div>
  );
}
