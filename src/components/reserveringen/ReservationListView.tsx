import { useMemo } from "react";
import { MoreHorizontal, MessageSquare, Phone, Globe, User, Search, MessageCircle, Footprints as FootprintsIcon, LogIn, LogOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Reservation, ReservationChannel } from "@/types/reservation";
import { STATUS_CONFIG, ALLOWED_TRANSITIONS } from "@/types/reservation";
import { getDisplayName, isWalkIn, formatTime, getTicketAbbreviation } from "@/lib/reservationUtils";
import { OptionBadge } from "@/components/reservations/OptionBadge";
import type { DensityType } from "./DensityToggle";

const GRID_COLS = "grid grid-cols-[12px_1fr_56px_72px_160px_120px_80px_32px] gap-x-3 items-center";

const CHANNEL_ICON_MAP: Record<ReservationChannel, React.FC<{ className?: string }>> = {
  widget: Globe,
  operator: User,
  phone: Phone,
  google: Search,
  whatsapp: MessageCircle,
  walk_in: FootprintsIcon,
};

function ChannelIcon({ channel }: { channel: ReservationChannel }) {
  const Icon = CHANNEL_ICON_MAP[channel];
  if (!Icon || channel === 'operator') return null;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
}

interface ReservationListViewProps {
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
  onStatusChange?: (reservation: Reservation, status: Reservation["status"]) => void;
  onAssignTable?: (reservation: Reservation) => void;
  density?: DensityType;
}

function StatusDot({ status }: { status: Reservation["status"] }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span
      className="inline-block rounded-full flex-shrink-0 h-2.5 w-2.5"
      style={{ backgroundColor: config.dotColor }}
      title={config.label}
    />
  );
}

function groupByTimeSlot(reservations: Reservation[]): Map<string, Reservation[]> {
  const groups = new Map<string, Reservation[]>();
  const sorted = [...reservations].sort((a, b) => a.start_time.localeCompare(b.start_time));
  sorted.forEach((reservation) => {
    const timeSlot = reservation.start_time;
    if (!groups.has(timeSlot)) {
      groups.set(timeSlot, []);
    }
    groups.get(timeSlot)!.push(reservation);
  });
  return groups;
}

function ColumnHeader() {
  return (
    <div className={cn(GRID_COLS, "px-4 pb-2 pt-1 sticky top-0 z-20 bg-card border-b border-border")}>
      <span />
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Naam</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pers</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tafel</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Shift / Ticket</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Acties</span>
      <span />
    </div>
  );
}

export function ReservationListView({
  reservations,
  onReservationClick,
  onStatusChange,
  onAssignTable,
  density = "compact",
}: ReservationListViewProps) {
  const groupedReservations = useMemo(() => groupByTimeSlot(reservations), [reservations]);
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
    <div>
      <ColumnHeader />
      {Array.from(groupedReservations.entries()).map(([timeSlot, reservationsInSlot]) => (
        <div key={timeSlot}>
          <div className={cn(
            "px-4 border-b border-border bg-muted/30",
            isCompact ? "py-1.5" : "py-2"
          )}>
            <span className={cn("font-semibold text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
              {formatTime(timeSlot)}
            </span>
            <span className={cn("text-muted-foreground ml-2", isCompact ? "text-xs" : "text-sm")}>
              ({reservationsInSlot.length})
            </span>
          </div>

          <div className={cn("divide-y", isCompact ? "divide-border/50" : "divide-border")}>
            {reservationsInSlot.map((reservation) => (
              <ReservationRow
                key={reservation.id}
                reservation={reservation}
                onClick={() => onReservationClick?.(reservation)}
                onStatusChange={onStatusChange}
                onAssignTable={onAssignTable}
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
  onAssignTable?: (reservation: Reservation) => void;
  density: DensityType;
}

function ReservationRow({ reservation, onClick, onStatusChange, onAssignTable, density }: ReservationRowProps) {
  const statusConfig = STATUS_CONFIG[reservation.status];
  const guestName = getDisplayName(reservation);
  const walkIn = isWalkIn(reservation);
  const isCompact = density === "compact";
  const allowedNextStatuses = ALLOWED_TRANSITIONS[reservation.status] ?? [];

  return (
    <div
      className={cn(
        GRID_COLS,
        "px-4 hover:bg-accent/40 cursor-pointer transition-colors duration-150",
        isCompact ? "py-2" : "py-3",
        reservation.status === "cancelled" && "opacity-50",
        reservation.status === "no_show" && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Status dot */}
      <StatusDot status={reservation.status} />

      {/* Naam */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-foreground truncate text-sm">
          {guestName}
        </span>
        {walkIn && (
          <NestoBadge variant="outline" size="sm">WALK-IN</NestoBadge>
        )}
        {reservation.customer?.phone_number && (
          <Phone className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      {/* Personen */}
      <span className="text-sm tabular-nums font-medium text-foreground">{reservation.party_size}p</span>

      {/* Tafel */}
      {/* Tafel */}
      {reservation.table_id ? (
        <span className="text-sm text-muted-foreground truncate">{reservation.table_label || '—'}</span>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onAssignTable?.(reservation); }}
                className="flex items-center gap-1.5 cursor-pointer group/assign"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
                <span className="text-sm text-muted-foreground">—</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Klik om tafel toe te wijzen</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Shift / Ticket */}
      <div className="flex items-center gap-1.5 min-w-0">
        {reservation.shift_name ? (
          <NestoBadge variant="outline" size="sm" className="truncate justify-center text-muted-foreground max-w-[100px]">
            {reservation.shift_name}
          </NestoBadge>
        ) : <span />}
        {reservation.ticket_name && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tracking-wide flex-shrink-0">
                  {getTicketAbbreviation(reservation.ticket_name)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{reservation.ticket_name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-1.5">
        {statusConfig && (
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium text-xs px-2.5 py-1",
            statusConfig.textClass,
            statusConfig.bgClass,
            statusConfig.borderClass,
          )}>
            {statusConfig.showDot && (
              <span
                className="rounded-full flex-shrink-0 w-1.5 h-1.5"
                style={{ backgroundColor: statusConfig.dotColor }}
              />
            )}
            {statusConfig.label}
          </span>
        )}
        {reservation.status === 'option' && (
          <OptionBadge optionExpiresAt={reservation.option_expires_at} />
        )}
      </div>

      {/* Acties (vaste breedte, verspringt niet) */}
      <div className="flex items-center justify-end gap-1 min-w-0">
        {reservation.status === 'confirmed' && onStatusChange && (
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange(reservation, 'seated'); }}
            className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
            title="Inchecken"
          >
            <LogIn className="h-[18px] w-[18px]" />
          </button>
        )}
        {reservation.status === 'seated' && onStatusChange && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(reservation, 'confirmed'); }}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground/60 transition-colors"
              title="Check-in ongedaan maken"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(reservation, 'completed'); }}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Uitchecken"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Menu */}
      {allowedNextStatuses.length > 0 ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-border" onClick={(e) => e.stopPropagation()}>
            {allowedNextStatuses.map((nextStatus) => {
              const nextConfig = STATUS_CONFIG[nextStatus];
              const isDestructive = nextStatus === 'cancelled' || nextStatus === 'no_show';
              return (
                <DropdownMenuItem
                  key={nextStatus}
                  onClick={(e) => { e.stopPropagation(); onStatusChange?.(reservation, nextStatus); }}
                  className={isDestructive ? 'text-destructive' : undefined}
                >
                  {nextConfig?.label ?? nextStatus}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : <span />}
    </div>
  );
}
