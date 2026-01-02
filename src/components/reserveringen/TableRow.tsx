import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Table,
  Reservation,
  getReservationsForTableMutable,
  GridTimeConfig,
  defaultGridConfig,
} from "@/data/reservations";
import { ReservationBlock } from "./ReservationBlock";

interface TableRowProps {
  table: Table;
  date: string;
  config?: GridTimeConfig;
  onReservationClick?: (reservation: Reservation) => void;
  onReservationResize?: (reservationId: string, newStartTime: string, newEndTime: string) => boolean;
  isOdd?: boolean;
}

// Constants - must match ReservationGridView
const STICKY_COL_WIDTH = 100;

// Status dot for table online bookability
function TableStatusDot({ table }: { table: Table }) {
  // Green = online bookable, Red = offline
  const dotColor = table.isOnlineBookable 
    ? "bg-emerald-500"  // Online
    : "bg-red-500";     // Offline
  
  return <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />;
}

export function TableRow({
  table,
  date,
  config = defaultGridConfig,
  onReservationClick,
  onReservationResize,
  isOdd = false,
}: TableRowProps) {
  const reservations = useMemo(
    () => getReservationsForTableMutable(date, table.id),
    [date, table.id]
  );

  // Calculate grid width
  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;

  // Make the grid area droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
    data: { tableId: table.id, date },
  });

  return (
    <div
      className={cn(
        "flex border-b border-border/50 h-14",
        isOdd ? "bg-muted/20" : "bg-card"
      )}
    >
      {/* Sticky left column - Table info - horizontal layout */}
      <div 
        className={cn(
          "sticky left-0 z-10 flex-shrink-0 flex items-center justify-between px-3 border-r-2 border-border",
          isOdd ? "bg-muted/20" : "bg-card"
        )}
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        {/* Table number - left side */}
        <span className="text-sm font-semibold text-foreground">
          {table.number}
        </span>
        
        {/* Capacity + dot - right side */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground italic">
            {table.minCapacity}-{table.maxCapacity}
          </span>
          <TableStatusDot table={table} />
        </div>
      </div>

      {/* Grid area for reservation blocks - droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          "relative flex-shrink-0 transition-colors",
          isOver && "bg-primary/10"
        )}
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
              onResize={onReservationResize}
            />
          ))}
      </div>
    </div>
  );
}

export { STICKY_COL_WIDTH };
