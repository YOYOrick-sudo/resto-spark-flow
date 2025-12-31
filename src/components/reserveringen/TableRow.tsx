import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  Reservation,
  getReservationsForTable,
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

// Constants - must match ReservationGridView
const STICKY_COL_WIDTH = 80;

// Status dot for table availability
function TableStatusDot({ reservations }: { reservations: Reservation[] }) {
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

  return <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />;
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
        "flex border-b border-border/50 h-14",
        isOdd ? "bg-muted/20" : "bg-card"
      )}
    >
      {/* Sticky left column - Table info */}
      <div 
        className={cn(
          "sticky left-0 z-10 flex-shrink-0 flex items-center gap-2 px-3 border-r-2 border-border",
          isOdd ? "bg-muted/20" : "bg-card"
        )}
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        {/* Table number - large and bold */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-base font-bold text-foreground leading-tight">
            {table.number}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            {table.minCapacity}-{table.maxCapacity}p
          </span>
        </div>
        {/* Status dot */}
        <TableStatusDot reservations={reservations} />
      </div>

      {/* Grid area for reservation blocks */}
      <div
        className="relative flex-shrink-0"
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
