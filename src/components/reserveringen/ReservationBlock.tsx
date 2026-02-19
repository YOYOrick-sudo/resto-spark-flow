import { useMemo, useState, useCallback, useRef, forwardRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Phone, LogIn, Footprints, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/types/reservation";
import { OptionBadge } from "@/components/reservations/OptionBadge";
import {
  getDisplayName,
  isWalkIn,
  calculateBlockPosition,
  timeToMinutes,
  minutesToTime,
  type GridTimeConfig,
  defaultGridConfig,
} from "@/lib/reservationUtils";

import type { DensityType } from "./DensityToggle";

interface ReservationBlockProps {
  reservation: Reservation;
  config?: GridTimeConfig;
  onClick?: (reservation: Reservation) => void;
  onCheckIn?: (reservation: Reservation) => void;
  onResize?: (reservationId: string, newStartTime: string, newEndTime: string) => boolean;
  onAssign?: (reservation: Reservation) => void;
  isBeingDragged?: boolean;
  density?: DensityType;
  variant?: 'default' | 'unassigned';
}

export const ReservationBlock = forwardRef<HTMLDivElement, ReservationBlockProps>(
  function ReservationBlock({
    reservation,
    config = defaultGridConfig,
    onClick,
    onCheckIn,
    onResize,
    onAssign,
    isBeingDragged = false,
    density = "compact",
    variant = "default",
  }, forwardedRef) {
  const isCompact = density === "compact";
  const position = useMemo(
    () => calculateBlockPosition(reservation.start_time, reservation.end_time, config),
    [reservation.start_time, reservation.end_time, config]
  );

  const guestName = getDisplayName(reservation);
  const walkIn = isWalkIn(reservation);

  // Resize state
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeDelta, setResizeDelta] = useState(0);
  const startPosRef = useRef({ x: 0, originalStart: 0, originalWidth: 0 });

  // Long-press state for iPad check-in
  const longPressTimerRef = useRef<number | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const canCheckIn = reservation.status === "confirmed" && onCheckIn;

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handlePressStart = useCallback((e: React.PointerEvent) => {
    if (!canCheckIn || isResizing) return;
    if (e.pointerType !== 'touch') return;
    e.stopPropagation();
    setIsLongPressing(true);
    longPressTimerRef.current = window.setTimeout(() => {
      setIsLongPressing(false);
      onCheckIn?.(reservation);
    }, 500);
  }, [canCheckIn, onCheckIn, reservation, isResizing]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: reservation.id,
    data: { reservation },
    disabled: isResizing !== null || isLongPressing,
  });

  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [setNodeRef, forwardedRef]);

  const getBlockStyles = () => {
    if (variant === 'unassigned') {
      return "bg-warning/10 border-warning/60 dark:bg-warning/15 dark:border-warning/50";
    }
    switch (reservation.status) {
      case "seated":
        return "bg-emerald-100 border-emerald-400 dark:bg-emerald-900/40 dark:border-emerald-600";
      case "confirmed":
        return "bg-primary/10 border-primary/40";
      case "draft":
      case "option":
        return "bg-muted border-border";
      case "pending_payment":
        return "bg-warning/10 border-warning/30";
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

  const calculateNewTimes = useCallback((side: 'left' | 'right', delta: number) => {
    const startMinutes = timeToMinutes(reservation.start_time);
    const endMinutes = timeToMinutes(reservation.end_time);
    const minutesDelta = Math.round(delta / config.pixelsPerMinute / 15) * 15;

    if (side === 'left') {
      const newStart = startMinutes + minutesDelta;
      if (endMinutes - newStart < 15) return null;
      if (newStart < config.startHour * 60) return null;
      return { newStartTime: minutesToTime(newStart), newEndTime: reservation.end_time };
    } else {
      const newEnd = endMinutes + minutesDelta;
      if (newEnd - startMinutes < 15) return null;
      if (newEnd > config.endHour * 60) return null;
      return { newStartTime: reservation.start_time, newEndTime: minutesToTime(newEnd) };
    }
  }, [reservation.start_time, reservation.end_time, config]);

  const handleResizeStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(side);
    setResizeDelta(0);
    startPosRef.current = { x: e.clientX, originalStart: position.left, originalWidth: position.width };

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

  const displayPosition = useMemo(() => {
    if (!isResizing) return position;
    if (isResizing === 'left') {
      const snappedDelta = Math.round(resizeDelta / config.pixelsPerMinute / 15) * 15 * config.pixelsPerMinute;
      return { left: position.left + snappedDelta, width: Math.max(position.width - snappedDelta, 15 * config.pixelsPerMinute) };
    } else {
      const snappedDelta = Math.round(resizeDelta / config.pixelsPerMinute / 15) * 15 * config.pixelsPerMinute;
      return { left: position.left, width: Math.max(position.width + snappedDelta, 15 * config.pixelsPerMinute) };
    }
  }, [position, isResizing, resizeDelta, config.pixelsPerMinute]);

  const style = {
    left: `${displayPosition.left}px`,
    width: `${Math.max(displayPosition.width - 4, 50)}px`,
    touchAction: 'none' as const,
  };

  return (
    <div
      ref={combinedRef}
      {...(isResizing || isBeingDragged ? {} : listeners)}
      {...(isResizing || isBeingDragged ? {} : attributes)}
      className={cn(
        "absolute rounded-md border-[1.5px] flex items-center gap-1.5 text-xs overflow-hidden select-none group pointer-events-auto",
        isCompact ? "top-0.5 bottom-0.5" : "top-1.5 bottom-1.5",
        getBlockStyles(),
        "transition-all duration-150",
        isBeingDragged && "opacity-30 pointer-events-none border-dashed",
        !isBeingDragged && isClickable && !isResizing && "cursor-grab hover:shadow-lg hover:scale-[1.02] hover:z-20",
        isResizing && "z-50 shadow-xl ring-2 ring-primary",
        isLongPressing && "scale-95 ring-2 ring-emerald-400 brightness-110"
      )}
      style={style}
      onClick={(e) => {
        if (!isDragging && !isResizing && isClickable) {
          e.stopPropagation();
          onClick?.(reservation);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isDragging && !isResizing && canCheckIn) {
          onCheckIn?.(reservation);
        }
      }}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onPointerCancel={handlePressEnd}
      title={canCheckIn
        ? `${guestName} - ${reservation.party_size}p - Dubbelklik of houd ingedrukt om in te checken`
        : `${guestName} - ${reservation.party_size}p - ${reservation.start_time}-${reservation.end_time}`}
    >
      {canResize && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 rounded-l-md z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        />
      )}

      <div className={cn("flex items-center min-w-0 flex-1", isCompact ? "gap-1 px-1.5" : "gap-1.5 px-2.5")}>
        {walkIn ? (
          <Footprints className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : reservation.status === "seated" ? (
          <LogIn className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        ) : null}

        <span className={cn("text-foreground font-bold flex-shrink-0", isCompact ? "text-xs" : "text-sm")}>
          {reservation.party_size}
        </span>

        <span className={cn("truncate text-foreground/80 font-medium min-w-0", isCompact ? "text-caption" : "text-xs")}>
          {guestName}
        </span>

        {reservation.is_squeeze && (
          <span className="text-caption px-1 py-0.5 rounded bg-accent/20 text-accent-foreground font-bold flex-shrink-0" title="Squeeze">S</span>
        )}

        {reservation.status === 'option' && (
          <OptionBadge optionExpiresAt={reservation.option_expires_at} className="flex-shrink-0" />
        )}

        {reservation.no_show_risk_score !== null && reservation.no_show_risk_score >= 30 && (
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              reservation.no_show_risk_score >= 50 ? "bg-destructive" : "bg-warning"
            )}
            title={`Risico: ${reservation.no_show_risk_score}%`}
          />
        )}

        {reservation.customer?.phone_number && !walkIn && displayPosition.width > 100 && (
          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}

        {reservation.shift_name && displayPosition.width > 140 && (
          <span className="text-caption px-1.5 py-0.5 rounded font-bold flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 text-primary">
            {reservation.shift_name}
          </span>
        )}
      </div>

      {variant === 'unassigned' && onAssign && (
        <button
          onClick={(e) => { e.stopPropagation(); onAssign(reservation); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-warning text-warning-foreground rounded p-0.5 z-20"
          title="Automatisch tafel toewijzen"
        >
          <Wand2 className="h-3 w-3" />
        </button>
      )}

      {canResize && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 rounded-r-md z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        />
      )}
    </div>
  );
});
