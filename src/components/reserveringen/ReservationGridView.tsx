import { useMemo, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Reservation,
  getActiveZones,
  getTablesByZone,
  getSeatedCountAtTime,
  getHourLabels,
  GridTimeConfig,
  defaultGridConfig,
} from "@/data/reservations";
import { TableRow } from "./TableRow";

interface ReservationGridViewProps {
  selectedDate: Date;
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
  config?: GridTimeConfig;
}

// Timeline header with hour labels
function TimelineHeader({ config }: { config: GridTimeConfig }) {
  const hourLabels = useMemo(() => getHourLabels(config), [config]);
  const hourWidth = 60 * config.pixelsPerMinute; // 60 minutes * pixels per minute

  return (
    <div className="sticky top-0 z-20 flex border-b border-border bg-muted/80 backdrop-blur-sm">
      {/* Empty cell for table column */}
      <div className="sticky left-0 z-30 w-20 flex-shrink-0 bg-muted/80 border-r border-border" />
      
      {/* Hour labels */}
      <div className="flex">
        {hourLabels.map((hour, index) => (
          <div
            key={hour}
            className="text-xs font-medium text-muted-foreground flex items-center justify-start px-1 border-r border-border/30"
            style={{ width: `${hourWidth}px` }}
          >
            {hour}
          </div>
        ))}
      </div>
    </div>
  );
}

// Seated count row
function SeatedCountRow({
  date,
  config,
  isExpanded,
  onToggle,
}: {
  date: string;
  config: GridTimeConfig;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hourLabels = useMemo(() => getHourLabels(config), [config]);
  const hourWidth = 60 * config.pixelsPerMinute;

  const seatedCounts = useMemo(() => {
    return hourLabels.map((hour) => getSeatedCountAtTime(date, hour));
  }, [date, hourLabels]);

  return (
    <div className="flex border-b border-border bg-muted/50">
      {/* Label cell */}
      <div className="sticky left-0 z-10 w-20 flex-shrink-0 flex items-center justify-between px-2 py-1.5 bg-muted/50 border-r border-border">
        <span className="text-xs font-medium text-muted-foreground">Seated</span>
        <button
          onClick={onToggle}
          className="p-0.5 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>
      
      {/* Seated counts per hour */}
      <div className="flex">
        {seatedCounts.map((count, index) => (
          <div
            key={index}
            className="text-xs font-medium text-center flex items-center justify-center border-r border-border/30"
            style={{ width: `${hourWidth}px` }}
          >
            <span
              className={cn(
                "px-1.5 py-0.5 rounded",
                count > 0 && "bg-primary/10 text-primary",
                count === 0 && "text-muted-foreground"
              )}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Zone header
function ZoneHeader({ name, config }: { name: string; config: GridTimeConfig }) {
  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;
  
  return (
    <div className="flex bg-secondary border-b border-border">
      <div className="sticky left-0 z-10 w-20 flex-shrink-0 bg-secondary" />
      <div
        className="flex items-center px-3 py-1.5 flex-shrink-0"
        style={{ width: `${gridWidth}px` }}
      >
        <span className="text-xs font-semibold text-foreground">{name}</span>
      </div>
    </div>
  );
}

// Now indicator line - real-time red vertical line
function NowIndicator({ config }: { config: GridTimeConfig }) {
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const gridStartMinutes = config.startHour * 60;
      const gridEndMinutes = config.endHour * 60;

      if (currentTimeMinutes >= gridStartMinutes && currentTimeMinutes < gridEndMinutes) {
        const offset = (currentTimeMinutes - gridStartMinutes) * config.pixelsPerMinute;
        setPosition(offset);
      } else {
        setPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [config]);

  if (position === null) return null;

  return (
    <>
      {/* Subtle highlight band behind the line */}
      <div
        className="absolute top-0 bottom-0 bg-destructive/5 pointer-events-none z-10"
        style={{ 
          left: `${80 + position - 2}px`,
          width: '6px'
        }}
      />
      {/* Main red line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
        style={{ left: `${80 + position}px` }}
      >
        {/* Sticky NU label at top */}
        <div className="sticky top-0 -translate-x-1/2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-b shadow-sm whitespace-nowrap">
          NU
        </div>
      </div>
    </>
  );
}

export function ReservationGridView({
  selectedDate,
  reservations,
  onReservationClick,
  config = defaultGridConfig,
}: ReservationGridViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [seatedExpanded, setSeatedExpanded] = useState(true);
  
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const zones = useMemo(() => getActiveZones(), []);
  
  const gridWidth = (config.endHour - config.startHour) * 60 * config.pixelsPerMinute;

  // Scroll to current time on mount
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const gridStartMinutes = config.startHour * 60;

      if (currentTimeMinutes >= gridStartMinutes) {
        const scrollPosition = (currentTimeMinutes - gridStartMinutes) * config.pixelsPerMinute - 200;
        containerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [config]);

  return (
    <div className="relative h-full overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-auto"
      >
        {/* Now indicator */}
        <NowIndicator config={config} />

        <div className="min-w-max">
          {/* Timeline header */}
          <TimelineHeader config={config} />

          {/* Seated count row */}
          <SeatedCountRow
            date={dateString}
            config={config}
            isExpanded={seatedExpanded}
            onToggle={() => setSeatedExpanded(!seatedExpanded)}
          />

          {/* Zones with tables */}
          {zones.map((zone) => {
            const tables = getTablesByZone(zone.id);
            if (tables.length === 0) return null;

            return (
              <div key={zone.id}>
                {/* Zone header */}
                <ZoneHeader name={zone.name} config={config} />

                {/* Table rows */}
                {tables.map((table, index) => (
                  <TableRow
                    key={table.id}
                    table={table}
                    date={dateString}
                    config={config}
                    onReservationClick={onReservationClick}
                    isOdd={index % 2 === 1}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
