import { useMemo } from "react";
import { MoreHorizontal, MessageSquare, Phone, Globe, User, Search, MessageCircle, Footprints as FootprintsIcon, UserCheck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Reservation, ReservationChannel } from "@/types/reservation";
import { STATUS_CONFIG, ALLOWED_TRANSITIONS, CHANNEL_ICONS } from "@/types/reservation";
import { getDisplayName, isWalkIn, formatTime } from "@/lib/reservationUtils";
import { OptionBadge } from "@/components/reservations/OptionBadge";
import type { DensityType } from "./DensityToggle";

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
  density?: DensityType;
}

function StatusDot({ status, density = "compact" }: { status: Reservation["status"]; density?: DensityType }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span
      className={cn("inline-block rounded-full flex-shrink-0 h-2.5 w-2.5")}
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

export function ReservationListView({
  reservations,
  onReservationClick,
  onStatusChange,
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
    <div className="space-y-0">
      {Array.from(groupedReservations.entries()).map(([timeSlot, reservationsInSlot]) => (
        <div key={timeSlot}>
          <div className={cn(
            "sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 border-b border-border shadow-sm",
            isCompact ? "py-2" : "py-3"
          )}>
            <span className={cn("font-semibold text-foreground", isCompact ? "text-xs" : "text-sm")}>
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
  const statusConfig = STATUS_CONFIG[reservation.status];
  const guestName = getDisplayName(reservation);
  const tableLabel = reservation.table_label || '—';
  const walkIn = isWalkIn(reservation);
  const isCompact = density === "compact";
  const allowedNextStatuses = ALLOWED_TRANSITIONS[reservation.status] ?? [];

  return (
    <div
      className={cn(
        "flex items-center px-4 hover:bg-muted/30 cursor-pointer transition-colors duration-150",
        isCompact ? "gap-3 py-3" : "gap-4 py-4",
        reservation.status === "cancelled" && "opacity-50",
        reservation.status === "no_show" && "opacity-60"
      )}
      onClick={onClick}
    >
      <StatusDot status={reservation.status} density={density} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate text-sm">
            {guestName}
          </span>
          {walkIn && (
            <NestoBadge variant="outline" size="sm">WALK-IN</NestoBadge>
          )}
          {reservation.customer?.phone_number && (
            <Phone className={cn("text-muted-foreground flex-shrink-0", isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} />
          )}
        </div>
      </div>

      <div className={cn("flex items-center gap-1 text-muted-foreground", isCompact ? "text-xs min-w-[70px]" : "text-sm min-w-[80px]")}>
        <span className="font-medium text-foreground">{reservation.party_size}p</span>
        {tableLabel !== '—' && (
          <>
            <span>•</span>
            <span>{tableLabel}</span>
          </>
        )}
      </div>

      {/* Risk score */}
      <div className={cn("flex-shrink-0", isCompact ? "w-[40px]" : "w-[50px]")}>
        {reservation.no_show_risk_score !== null && reservation.no_show_risk_score > 0 ? (
          <span className={cn(
            "text-xs font-medium",
            reservation.no_show_risk_score >= 50 ? "text-destructive" :
            reservation.no_show_risk_score >= 30 ? "text-warning" :
            "text-muted-foreground"
          )}>
            {reservation.no_show_risk_score}%
          </span>
        ) : null}
      </div>

      {/* Channel icon */}
      <div className="flex-shrink-0 w-[20px]">
        <ChannelIcon channel={reservation.channel} />
      </div>

      <div className={cn("truncate", isCompact ? "w-[100px]" : "w-[120px]")}>
        {reservation.guest_notes && (
          <span className={cn("text-muted-foreground/70 italic truncate", isCompact ? "text-xs" : "text-sm")}>
            {reservation.guest_notes}
          </span>
        )}
      </div>

      {reservation.shift_name && (
        <NestoBadge variant="outline" size="sm" className="min-w-[80px] max-w-[120px] truncate justify-center text-muted-foreground">
          {reservation.shift_name}
        </NestoBadge>
      )}

      {statusConfig && (
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium justify-center",
          isCompact ? "text-xs px-2.5 py-1 min-w-[85px]" : "text-xs px-2.5 py-1 min-w-[90px]",
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
      )}

      {reservation.status === 'option' && (
        <OptionBadge optionExpiresAt={reservation.option_expires_at} />
      )}

      {/* Quick check-in/out */}
      {reservation.status === 'confirmed' && onStatusChange && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(reservation, 'seated'); }}
          className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
          title="Inchecken"
        >
          <UserCheck className="h-4 w-4" />
        </button>
      )}
      {reservation.status === 'seated' && onStatusChange && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(reservation, 'completed'); }}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"
          title="Uitchecken"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className={cn("text-muted-foreground", isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
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
    </div>
  );
}
