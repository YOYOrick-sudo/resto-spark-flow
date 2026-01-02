import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Phone, Star, UserCheck, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Reservation,
  getGuestDisplayName,
  calculateBlockPosition,
  GridTimeConfig,
  defaultGridConfig,
} from "@/data/reservations";

interface ReservationBlockProps {
  reservation: Reservation;
  config?: GridTimeConfig;
  onClick?: (reservation: Reservation) => void;
}

export function ReservationBlock({
  reservation,
  config = defaultGridConfig,
  onClick,
}: ReservationBlockProps) {
  const position = useMemo(
    () => calculateBlockPosition(reservation.startTime, reservation.endTime, config),
    [reservation.startTime, reservation.endTime, config]
  );

  const guestName = getGuestDisplayName(reservation);

  // Make it draggable
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: reservation.id,
    data: { reservation },
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

  const style = {
    left: `${position.left}px`,
    width: `${Math.max(position.width - 4, 50)}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "absolute top-1.5 bottom-1.5 rounded-md border-[1.5px] px-2 flex items-center gap-1.5 text-xs overflow-hidden transition-all select-none",
        getBlockStyles(),
        isClickable && "cursor-grab hover:shadow-lg hover:scale-[1.02] hover:z-20",
        isDragging && "opacity-50 cursor-grabbing z-50 shadow-xl"
      )}
      style={style}
      onClick={(e) => {
        if (!isDragging && isClickable) {
          e.stopPropagation();
          onClick?.(reservation);
        }
      }}
      title={`${guestName} - ${reservation.guests}p - ${reservation.startTime}-${reservation.endTime}`}
    >
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
      {reservation.phone && !reservation.isWalkIn && position.width > 100 && (
        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}

      {/* Shift badge - only show if there's enough space */}
      {position.width > 140 && (
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
  );
}
