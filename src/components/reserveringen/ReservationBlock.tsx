import { useMemo } from "react";
import { Phone, Star, UserCheck, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Reservation,
  getGuestDisplayName,
  reservationStatusConfig,
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

  const statusConfig = reservationStatusConfig[reservation.status];
  const guestName = getGuestDisplayName(reservation);

  // Status-based background colors
  const getBackgroundClass = () => {
    switch (reservation.status) {
      case "seated":
      case "checked_in":
        return "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700";
      case "confirmed":
        return "bg-primary/10 border-primary/30";
      case "pending":
        return "bg-muted border-border";
      case "cancelled":
        return "bg-red-50 border-red-200 opacity-50 dark:bg-red-900/20 dark:border-red-800";
      case "no_show":
        return "bg-orange-50 border-orange-200 opacity-60 dark:bg-orange-900/20 dark:border-orange-800";
      case "completed":
        return "bg-muted/50 border-border/50 opacity-60";
      default:
        return "bg-muted border-border";
    }
  };

  const isClickable = reservation.status !== "cancelled" && reservation.status !== "completed";

  return (
    <div
      className={cn(
        "absolute top-1 bottom-1 rounded-lg border px-2 flex items-center gap-1.5 text-xs font-medium overflow-hidden",
        getBackgroundClass(),
        isClickable && "cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
      )}
      style={{
        left: `${position.left}px`,
        width: `${Math.max(position.width - 4, 40)}px`,
      }}
      onClick={() => isClickable && onClick?.(reservation)}
      title={`${guestName} - ${reservation.guests}p - ${reservation.startTime}-${reservation.endTime}`}
    >
      {/* Seated/Walk-in icon */}
      {reservation.isWalkIn ? (
        <Footprints className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      ) : reservation.status === "seated" || reservation.status === "checked_in" ? (
        <UserCheck className="h-3 w-3 text-emerald-600 flex-shrink-0" />
      ) : null}

      {/* Guest count */}
      <span className="text-foreground font-semibold flex-shrink-0">
        {reservation.guests}
      </span>

      {/* Guest name - truncated */}
      <span className="truncate text-foreground/80 min-w-0">
        {guestName}
      </span>

      {/* VIP indicator */}
      {reservation.isVip && (
        <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
      )}

      {/* Phone indicator */}
      {reservation.phone && !reservation.isWalkIn && (
        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}

      {/* Shift badge - only show if there's enough space */}
      {position.width > 120 && (
        <span
          className={cn(
            "text-[10px] px-1 py-0.5 rounded font-medium flex-shrink-0 ml-auto",
            reservation.shift === "ED"
              ? "bg-primary/20 text-primary"
              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
          )}
        >
          {reservation.shift}
        </span>
      )}
    </div>
  );
}
