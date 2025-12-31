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

// Constants
const STICKY_COL_WIDTH = 80;

// Grid lines component - renders vertical lines for hours and quarter hours
function GridLines({ config }: { config: GridTimeConfig }) {
  const hours = useMemo(() => {
    const result = [];
    for (let h = config.startHour; h <= config.endHour; h++) {
      result.push(h);
    }
    return result;
  }, [config.startHour, config.endHour]);

  const hourWidth = 60 * config.pixelsPerMinute;
  const quarterWidth = 15 * config.pixelsPerMinute;

  return (
    <div 
      className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none"
      style={{ left: `${STICKY_COL_WIDTH}px` }}
    >
      {hours.map((hour, hourIndex) => (
        <div key={hour} className="absolute top-0 bottom-0">
          {/* Hour line - darker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${hourIndex * hourWidth}px` }}
          />
          {/* Quarter hour lines - lighter */}
          {[1, 2, 3].map((q) => (
            <div
              key={q}
              className="absolute top-0 bottom-0 w-px bg-border/30"
              style={{ left: `${hourIndex * hourWidth + q * quarterWidth}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Timeline header with hour labels
function TimelineHeader({ config }: { config: GridTimeConfig }) {
  const hourLabels = useMemo(() => getHourLabels(config), [config]);
  const hourWidth = 60 * config.pixelsPerMinute;

  return (
    <div className="sticky top-0 z-20 flex border-b-2 border-border bg-card">
      {/* Empty cell for table column */}
      <div 
        className="sticky left-0 z-30 flex-shrink-0 bg-card border-r-2 border-border h-10"
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      />
      
      {/* Hour labels */}
      <div className="flex h-10">
        {hourLabels.map((hour, index) => (
          <div
            key={hour}
            className={cn(
              "text-sm font-semibold text-muted-foreground flex items-center pl-2 border-l border-border",
              index === 0 && "border-l-0"
            )}
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
      <div 
        className="sticky left-0 z-10 flex-shrink-0 flex items-center justify-between px-3 py-2 bg-muted/50 border-r-2 border-border"
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      >
        <span className="text-xs font-semibold text-muted-foreground">Seated</span>
        <button
          onClick={onToggle}
          className="p-0.5 hover:bg-muted rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      
      {/* Seated counts per hour */}
      <div className="flex">
        {seatedCounts.map((count, index) => (
          <div
            key={index}
            className={cn(
              "text-sm font-semibold flex items-center justify-center py-2 border-l border-border",
              index === 0 && "border-l-0"
            )}
            style={{ width: `${hourWidth}px` }}
          >
            <span
              className={cn(
                "min-w-6 text-center px-2 py-0.5 rounded-full text-xs",
                count > 0 && "bg-primary/15 text-primary font-bold",
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
    <div className="flex bg-secondary/80 border-b border-t border-border">
      <div 
        className="sticky left-0 z-10 flex-shrink-0 bg-secondary/80 border-r-2 border-border"
        style={{ width: `${STICKY_COL_WIDTH}px` }}
      />
      <div
        className="flex items-center px-3 py-2 flex-shrink-0"
        style={{ width: `${gridWidth}px` }}
      >
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">{name}</span>
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

  const leftPos = STICKY_COL_WIDTH + position;

  return (
    <>
      {/* Subtle highlight band behind the line */}
      <div
        className="absolute top-0 bottom-0 bg-destructive/8 pointer-events-none z-10"
        style={{ 
          left: `${leftPos - 3}px`,
          width: '6px'
        }}
      />
      {/* Main red line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-destructive z-30 pointer-events-none"
        style={{ left: `${leftPos}px` }}
      >
        {/* NU label at top - sticky */}
        <div className="sticky top-1 -translate-x-1/2 w-fit">
          <div className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
            NU
          </div>
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
  const totalWidth = STICKY_COL_WIDTH + gridWidth;

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
    <div className="relative h-full overflow-hidden border border-border rounded-lg bg-card">
      <div
        ref={containerRef}
        className="h-full overflow-auto"
      >
        <div className="min-w-max relative" style={{ minWidth: `${totalWidth}px` }}>
          {/* Grid lines - behind everything */}
          <GridLines config={config} />

          {/* Now indicator - above grid lines, below content */}
          <NowIndicator config={config} />

          {/* Timeline header - sticky top */}
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
