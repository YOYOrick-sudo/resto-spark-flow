import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/types/reservation";
import type { Table } from "@/types/reservations";
import {
  type GridTimeConfig,
  defaultGridConfig,
} from "@/lib/reservationUtils";
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
  isDropAnimating?: boolean;
  density?: DensityType;
  reservations: Reservation[];
}

const STICKY_COL_WIDTH = 140;

function TableStatusDot({ table }: { table: Table }) {
  const dotColor = table.is_online_bookable
    ? "bg-emerald-500"
    : "bg-red-500";
  return <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />;
}

function generateQuarterSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let quarter = 0; quarter < 4; quarter++) {
      const minutes = quarter * 15;
      const displayHour = hour >= 24 ? hour - 24 : hour;
      slots.push(`${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
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
  isDropAnimating = false,
  density = "compact",
  reservations,
}: TableRowProps) {
  const isCompact = density === "compact";

  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;

  const quarterSlots = useMemo(
    () => generateQuarterSlots(config.startHour, config.endHour),
    [config.startHour, config.endHour]
  );

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
      <div
        className={cn(
          "sticky left-0 z-[60] flex-shrink-0 flex items-center justify-between px-3 border-r-2 border-border",
          isOdd ? "bg-secondary" : "bg-card"
        )}
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        <span className="text-sm font-semibold text-foreground">
          {table.display_label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground italic">
            {table.min_capacity}-{table.max_capacity}
          </span>
          <TableStatusDot table={table} />
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "relative flex-shrink-0 transition-colors",
          isOver && "bg-primary/10"
        )}
        style={{ width: `${gridWidth}px` }}
      >
        <div className="absolute inset-0 flex">
          {quarterSlots.map((time, index) => (
            <div
              key={time}
              onClick={() => onEmptySlotClick?.(table.id, time)}
              className={cn(
                "h-full cursor-pointer transition-colors hover:bg-primary/10",
                index % 4 === 0 ? "border-l border-border/50" : "border-l border-border/20",
                isDropTarget && ghostStartTime === time && "bg-primary/20 ring-2 ring-primary ring-inset"
              )}
              style={{ width: `${quarterWidth}px` }}
              title={`Tafel ${table.display_label} om ${time} - Klik om toe te voegen`}
            />
          ))}
        </div>

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
