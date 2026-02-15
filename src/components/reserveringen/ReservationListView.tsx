import { useMemo } from "react";
import { Star, MoreHorizontal, MessageSquare, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Reservation,
  reservationStatusConfig,
  getTableNumbers,
  getGuestDisplayName,
} from "@/data/reservations";
import type { DensityType } from "./DensityToggle";

interface ReservationListViewProps {
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
  onStatusChange?: (reservation: Reservation, status: Reservation["status"]) => void;
  density?: DensityType;
}

// Status dot component
function StatusDot({ status, density = "compact" }: { status: Reservation["status"]; density?: DensityType }) {
  const config = reservationStatusConfig[status];
  const isCompact = density === "compact";
  return (
    <span
      className={cn("inline-block rounded-full flex-shrink-0", isCompact ? "h-2 w-2" : "h-2.5 w-2.5")}
      style={{ backgroundColor: config.dotColor }}
      title={config.label}
    />
  );
}

// Group reservations by time slot
function groupByTimeSlot(reservations: Reservation[]): Map<string, Reservation[]> {
  const groups = new Map<string, Reservation[]>();
  
  const sorted = [...reservations].sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  );

  sorted.forEach((reservation) => {
    const timeSlot = reservation.startTime;
    if (!groups.has(timeSlot)) {
      groups.set(timeSlot, []);
    }
    groups.get(timeSlot)!.push(reservation);
  });

  return groups;
}

export function ReservationListView({
  reservations,
  onReservationClick,
  onStatusChange,
  density = "compact",
}: ReservationListViewProps) {
  const groupedReservations = useMemo(
    () => groupByTimeSlot(reservations),
    [reservations]
  );
  const isCompact = density === "compact";

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-secondary p-4 mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          Geen reserveringen gevonden voor deze dag
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {Array.from(groupedReservations.entries()).map(([timeSlot, reservationsInSlot]) => (
        <div key={timeSlot}>
          {/* Time slot header - sticky */}
          <div className={cn(
            "sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 border-b border-border shadow-sm",
            isCompact ? "py-1" : "py-2"
          )}>
            <span className={cn("font-semibold text-foreground", isCompact ? "text-xs" : "text-sm")}>
              {timeSlot}
            </span>
            <span className={cn("text-muted-foreground ml-2", isCompact ? "text-xs" : "text-sm")}>
              ({reservationsInSlot.length})
            </span>
          </div>

          {/* Reservations in this time slot */}
          <div className={cn("divide-y", isCompact ? "divide-border/30" : "divide-border")}>
            {reservationsInSlot.map((reservation) => (
              <ReservationRow
                key={reservation.id}
                reservation={reservation}
                onClick={() => onReservationClick?.(reservation)}
                onStatusChange={onStatusChange}
                density={density}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ReservationRowProps {
  reservation: Reservation;
  onClick?: () => void;
  onStatusChange?: (reservation: Reservation, status: Reservation["status"]) => void;
  density: DensityType;
}

function ReservationRow({ reservation, onClick, onStatusChange, density }: ReservationRowProps) {
  const statusConfig = reservationStatusConfig[reservation.status];
  const guestName = getGuestDisplayName(reservation);
  const tableNumbers = getTableNumbers(reservation.tableIds);
  const isCompact = density === "compact";

  return (
    <div
      className={cn(
        "flex items-center px-4 hover:bg-muted/30 cursor-pointer transition-colors duration-150",
        isCompact ? "gap-3 py-1.5" : "gap-4 py-3",
        reservation.status === "cancelled" && "opacity-50",
        reservation.status === "no_show" && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Status dot */}
      <StatusDot status={reservation.status} density={density} />

      {/* Guest name + indicators */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {reservation.isVip && (
            <Star className={cn("text-pending fill-pending flex-shrink-0", isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          )}
          <span className="font-medium text-foreground truncate text-sm">
            {guestName}
          </span>
          {reservation.isWalkIn && (
            <NestoBadge variant="outline" size="sm">
              WALK-IN
            </NestoBadge>
          )}
          {reservation.phone && (
            <Phone className={cn("text-muted-foreground flex-shrink-0", isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} />
          )}
        </div>
      </div>

      {/* Guests + Tables */}
      <div className={cn("flex items-center gap-1 text-muted-foreground", isCompact ? "text-xs min-w-[70px]" : "text-sm min-w-[80px]")}>
        <span className="font-medium text-foreground">{reservation.guests}p</span>
        {tableNumbers && (
          <>
            <span>•</span>
            <span>T{tableNumbers}</span>
          </>
        )}
      </div>

      {/* Notes indicator */}
      <div className={cn("truncate", isCompact ? "w-[100px]" : "w-[120px]")}>
        {reservation.notes && (
          <span className={cn("text-muted-foreground/70 italic truncate", isCompact ? "text-xs" : "text-sm")}>
            {reservation.notes}
          </span>
        )}
      </div>

      {/* Shift badge */}
      <NestoBadge
        variant="outline"
        size="sm"
        className="w-10 justify-center text-muted-foreground"
      >
        {reservation.shift}
      </NestoBadge>

      {/* Status badge */}
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium justify-center",
        isCompact ? "text-caption px-1.5 py-0 min-w-[80px]" : "text-xs px-2.5 py-1 min-w-[90px]",
        statusConfig.textClass,
        statusConfig.bgClass,
        statusConfig.borderClass,
      )}>
        {statusConfig.showDot && (
          <span
            className={cn("rounded-full flex-shrink-0", isCompact ? "w-1.5 h-1.5" : "w-2 h-2")}
            style={{ backgroundColor: statusConfig.dotColor }}
          />
        )}
        {statusConfig.label}
      </span>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className={cn("text-muted-foreground", isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(reservation, "checked_in"); }}>
            Check in
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(reservation, "seated"); }}>
            Seat
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(reservation, "completed"); }}>
            Complete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(reservation, "no_show"); }} className="text-warning">
            No show
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(reservation, "cancelled"); }} className="text-destructive">
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
