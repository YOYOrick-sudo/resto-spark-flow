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

interface ReservationListViewProps {
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
  onStatusChange?: (reservation: Reservation, status: Reservation["status"]) => void;
}

// Status dot component
function StatusDot({ status }: { status: Reservation["status"] }) {
  const config = reservationStatusConfig[status];
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: config.dotColor }}
      title={config.label}
    />
  );
}

// Group reservations by time slot
function groupByTimeSlot(reservations: Reservation[]): Map<string, Reservation[]> {
  const groups = new Map<string, Reservation[]>();
  
  // Sort reservations by start time first
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
}: ReservationListViewProps) {
  const groupedReservations = useMemo(
    () => groupByTimeSlot(reservations),
    [reservations]
  );

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
    <div className="space-y-1">
      {Array.from(groupedReservations.entries()).map(([timeSlot, reservationsInSlot]) => (
        <div key={timeSlot}>
          {/* Time slot header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              {timeSlot}
            </span>
            <span className="text-sm text-muted-foreground ml-2">
              ({reservationsInSlot.length})
            </span>
          </div>

          {/* Reservations in this time slot */}
          <div className="divide-y divide-border">
            {reservationsInSlot.map((reservation) => (
              <ReservationRow
                key={reservation.id}
                reservation={reservation}
                onClick={() => onReservationClick?.(reservation)}
                onStatusChange={onStatusChange}
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
}

function ReservationRow({ reservation, onClick, onStatusChange }: ReservationRowProps) {
  const statusConfig = reservationStatusConfig[reservation.status];
  const guestName = getGuestDisplayName(reservation);
  const tableNumbers = getTableNumbers(reservation.tableIds);

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors",
        reservation.status === "cancelled" && "opacity-50",
        reservation.status === "no_show" && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Status dot */}
      <StatusDot status={reservation.status} />

      {/* Guest name + indicators */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {reservation.isVip && (
            <Star className="h-3.5 w-3.5 text-pending fill-pending flex-shrink-0" />
          )}
          <span className="font-medium text-foreground truncate">
            {guestName}
          </span>
          {reservation.isWalkIn && (
            <NestoBadge variant="outline" size="sm">
              WALK-IN
            </NestoBadge>
          )}
          {reservation.phone && (
            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Guests + Tables */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-[80px]">
        <span className="font-medium text-foreground">{reservation.guests}p</span>
        {tableNumbers && (
          <>
            <span>•</span>
            <span>T{tableNumbers}</span>
          </>
        )}
      </div>

      {/* Notes indicator */}
      <div className="w-[120px] truncate">
        {reservation.notes && (
          <span className="text-sm text-muted-foreground italic truncate">
            {reservation.notes}
          </span>
        )}
      </div>

      {/* Shift badge */}
      <NestoBadge
        variant={reservation.shift === "ED" ? "primary" : "default"}
        size="sm"
        className="w-10 justify-center"
      >
        {reservation.shift}
      </NestoBadge>

      {/* Status badge */}
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium min-w-[90px] justify-center",
        statusConfig.textClass,
        statusConfig.bgClass,
        statusConfig.borderClass,
      )}>
        {statusConfig.showDot && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusConfig.dotColor }} />
        )}
        {statusConfig.label}
      </span>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(reservation, "checked_in");
            }}
          >
            Check in
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(reservation, "seated");
            }}
          >
            Seat
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(reservation, "completed");
            }}
          >
            Complete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(reservation, "no_show");
            }}
            className="text-warning"
          >
            No show
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(reservation, "cancelled");
            }}
            className="text-destructive"
          >
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
