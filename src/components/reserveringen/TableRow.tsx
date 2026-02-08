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
import type { DensityType } from "./DensityToggle";

interface TableRowProps {
  table: Table;
  date: string;
  config?: GridTimeConfig;
  onReservationClick?: (reservation: Reservation) => void;
  onReservationCheckIn?: (reservation: Reservation) => void;
  onReservationResize?: (reservationId: string, newStartTime: string, newEndTime: string) => boolean;
  onEmptySlotClick?: (tableId: string, time: string) => void;
  isOdd?: boolean;
  activeReservationId?: string | null;
  isDropTarget?: boolean;
  ghostStartTime?: string | null;
  refreshKey?: number;
  isDropAnimating?: boolean;
  density?: DensityType;
}

// Constants - must match ReservationGridView
const STICKY_COL_WIDTH = 140;

// Status dot for table online bookability
function TableStatusDot({ table }: { table: Table }) {
  // Green = online bookable, Red = offline
  const dotColor = table.isOnlineBookable 
    ? "bg-emerald-500"  // Online
    : "bg-red-500";     // Offline
  
  return <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />;
}

// Generate quarter-hour slots for the grid
function generateQuarterSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let quarter = 0; quarter < 4; quarter++) {
      const minutes = quarter * 15;
      slots.push(`${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

export function TableRow({
  table,
  date,
  config = defaultGridConfig,
  onReservationClick,
  onReservationCheckIn,
  onReservationResize,
  onEmptySlotClick,
  isOdd = false,
  activeReservationId = null,
  isDropTarget = false,
  ghostStartTime = null,
  refreshKey = 0,
  isDropAnimating = false,
  density = "compact",
}: TableRowProps) {
  const isCompact = density === "compact";
  const reservations = useMemo(
    () => getReservationsForTableMutable(date, table.id),
    [date, table.id, refreshKey]
  );

  // Calculate grid width and quarter width
  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;
  
  // Generate all quarter-hour slots
  const quarterSlots = useMemo(
    () => generateQuarterSlots(config.startHour, config.endHour),
    [config.startHour, config.endHour]
  );

  // Make the grid area droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
    data: { tableId: table.id, date },
  });

  return (
    <div
      className={cn(
        "flex border-b border-border/50 transition-colors duration-100",
        isCompact ? "h-9" : "h-12",
        isOdd ? "bg-secondary" : "bg-card",
        isDropTarget && "bg-primary/5"
      )}
    >
      {/* Sticky left column - Table info - horizontal layout */}
      <div 
        className={cn(
          "sticky left-0 z-30 flex-shrink-0 flex items-center justify-between px-3 border-r-2 border-border",
          isOdd ? "bg-secondary" : "bg-card"
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
        {/* Clickable quarter-hour cells (background layer) */}
        <div className="absolute inset-0 flex">
          {quarterSlots.map((time, index) => (
            <div
              key={time}
              onClick={() => onEmptySlotClick?.(table.id, time)}
              className={cn(
                "h-full cursor-pointer transition-colors hover:bg-primary/10",
                index % 4 === 0 ? "border-l border-border/50" : "border-l border-border/20",
                // Highlight specific 15-min cell as drop target
                isDropTarget && ghostStartTime === time && "bg-primary/20 ring-2 ring-primary ring-inset"
              )}
              style={{ width: `${quarterWidth}px` }}
              title={`Tafel ${table.number} om ${time} - Klik om toe te voegen`}
            />
          ))}
        </div>
        
        {/* Reservation blocks (foreground layer) */}
        <div className="absolute inset-0 z-10">
          {reservations
            .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
            .map((reservation) => (
              <ReservationBlock
                key={reservation.id}
                reservation={reservation}
                config={config}
                onClick={onReservationClick}
                onCheckIn={onReservationCheckIn}
                onResize={onReservationResize}
                isBeingDragged={reservation.id === activeReservationId || (isDropAnimating && reservation.id === activeReservationId)}
                density={density}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export { STICKY_COL_WIDTH };
