import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  Reservation,
  getReservationsForTable,
  reservationStatusConfig,
  GridTimeConfig,
  defaultGridConfig,
} from "@/data/reservations";
import { ReservationBlock } from "./ReservationBlock";

interface TableRowProps {
  table: Table;
  date: string;
  config?: GridTimeConfig;
  onReservationClick?: (reservation: Reservation) => void;
  isOdd?: boolean;
}

// Status dot for table availability
function TableStatusDot({ reservations }: { reservations: Reservation[] }) {
  // Determine current status based on reservations
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  const currentReservation = reservations.find((r) => {
    if (r.status === "cancelled" || r.status === "no_show" || r.status === "completed") {
      return false;
    }
    const [startH, startM] = r.startTime.split(":").map(Number);
    const [endH, endM] = r.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
  });

  let dotColor = "bg-emerald-500"; // Available (green)
  if (currentReservation) {
    if (currentReservation.status === "seated" || currentReservation.status === "checked_in") {
      dotColor = "bg-emerald-500"; // Occupied but active
    } else if (currentReservation.status === "confirmed") {
      dotColor = "bg-primary"; // Expected soon
    } else if (currentReservation.status === "pending") {
      dotColor = "bg-muted-foreground"; // Pending
    }
  }

  return <span className={cn("w-2 h-2 rounded-full", dotColor)} />;
}

export function TableRow({
  table,
  date,
  config = defaultGridConfig,
  onReservationClick,
  isOdd = false,
}: TableRowProps) {
  const reservations = useMemo(
    () => getReservationsForTable(date, table.id),
    [date, table.id]
  );

  // Calculate grid width
  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;

  return (
    <div
      className={cn(
        "flex border-b border-border/50",
        isOdd ? "bg-muted/30" : "bg-background"
      )}
    >
      {/* Sticky left column - Table info */}
      <div className="sticky left-0 z-10 w-20 flex-shrink-0 flex flex-col items-center justify-center py-2 px-2 bg-inherit border-r border-border">
        <span className="text-sm font-bold text-foreground">{table.number}</span>
        <span className="text-[10px] text-muted-foreground">
          {table.minCapacity}-{table.maxCapacity}
        </span>
        <TableStatusDot reservations={reservations} />
      </div>

      {/* Grid area for reservation blocks */}
      <div
        className="relative h-10 flex-shrink-0"
        style={{ width: `${gridWidth}px` }}
      >
        {reservations
          .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
          .map((reservation) => (
            <ReservationBlock
              key={reservation.id}
              reservation={reservation}
              config={config}
              onClick={onReservationClick}
            />
          ))}
      </div>
    </div>
  );
}
