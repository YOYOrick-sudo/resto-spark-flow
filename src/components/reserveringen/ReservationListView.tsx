import { useMemo } from "react";
import { MoreHorizontal, MessageSquare, Phone, Globe, User, Search, MessageCircle, Footprints as FootprintsIcon, LogIn, LogOut, RotateCcw, Sparkles, Clock, X, Send } from "lucide-react";
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
import { SparkleIndicator } from "@/components/polar/SparkleIndicator";
import { isAiChannel } from "@/utils/isAiGenerated";
import type { DensityType } from "./DensityToggle";
import type { WaitlistEntryWithInvites } from "@/hooks/useWaitlistEntries";

const GRID_COLS = "grid grid-cols-[12px_1fr_56px_72px_160px_100px_120px_80px_32px] gap-x-3 items-center";

const ALLERGEN_ABBR: Record<string, { abbr: string; label: string }> = {
  gluten: { abbr: 'GV', label: 'Glutenvrij' },
  lactose: { abbr: 'LV', label: 'Lactosevrij' },
  noten: { abbr: 'NO', label: 'Noten' },
  schaaldieren: { abbr: 'SD', label: 'Schaaldieren' },
  eieren: { abbr: 'EI', label: 'Eieren' },
  vis: { abbr: 'VI', label: 'Vis' },
  pinda: { abbr: 'PN', label: "Pinda's" },
  soja: { abbr: 'SO', label: 'Soja' },
  selderij: { abbr: 'SE', label: 'Selderij' },
  mosterd: { abbr: 'MO', label: 'Mosterd' },
  sesam: { abbr: 'SS', label: 'Sesam' },
  sulfieten: { abbr: 'SU', label: 'Sulfieten' },
  lupine: { abbr: 'LU', label: 'Lupine' },
  weekdieren: { abbr: 'WD', label: 'Weekdieren' },
};

function getDietaryAbbreviations(prefs: Record<string, unknown> | null | undefined): { abbr: string; label: string }[] {
  if (!prefs) return [];
  const items: { abbr: string; label: string }[] = [];
  if (prefs.vegetarian) items.push({ abbr: 'VEG', label: 'Vegetarisch' });
  if (prefs.vegan) items.push({ abbr: 'VGN', label: 'Vegan' });
  const allergens = Array.isArray(prefs.allergies) ? prefs.allergies : [];
  allergens.forEach((a: string) => {
    const info = ALLERGEN_ABBR[a];
    if (info) items.push(info);
    else items.push({ abbr: a.slice(0, 3).toUpperCase(), label: a });
  });
  return items;
}

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
  waitlistEntries?: WaitlistEntryWithInvites[];
  onReservationClick?: (reservation: Reservation) => void;
  onStatusChange?: (reservation: Reservation, status: Reservation["status"]) => void;
  onAssignTable?: (reservation: Reservation) => void;
  onInviteWaitlist?: (entryId: string) => void;
  onCancelWaitlist?: (entryId: string) => void;
  density?: DensityType;
  highlightId?: string | null;
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

function DietaryPills({ prefs }: { prefs: Record<string, unknown> | null | undefined }) {
  const items = getDietaryAbbreviations(prefs);
  if (items.length === 0) return <span />;
  const visible = items.slice(0, 3);
  const overflow = items.length - 3;
  const fullList = items.map(i => i.label).join(', ');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5 min-w-0">
            {visible.map((item) => (
              <span
                key={item.abbr}
                className="inline-flex items-center rounded bg-warning/15 text-warning px-1 py-0.5 text-[9px] font-semibold tracking-wide flex-shrink-0"
              >
                {item.abbr}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[9px] text-muted-foreground font-medium">+{overflow}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">{fullList}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type TimeSlotItem =
  | { type: 'reservation'; data: Reservation }
  | { type: 'waitlist'; data: WaitlistEntryWithInvites };

function buildMergedGroups(
  reservations: Reservation[],
  waitlistEntries: WaitlistEntryWithInvites[]
): Map<string, TimeSlotItem[]> {
  const groups = new Map<string, TimeSlotItem[]>();

  const sortedRes = [...reservations].sort((a, b) => a.start_time.localeCompare(b.start_time));
  sortedRes.forEach((r) => {
    const slot = r.start_time;
    if (!groups.has(slot)) groups.set(slot, []);
    groups.get(slot)!.push({ type: 'reservation', data: r });
  });

  const activeWaitlist = waitlistEntries.filter((e) => e.status !== 'cancelled' && e.status !== 'booked');
  const withTime: WaitlistEntryWithInvites[] = [];
  const noTime: WaitlistEntryWithInvites[] = [];

  activeWaitlist.forEach((e) => {
    if (e.preferred_time_from) withTime.push(e);
    else noTime.push(e);
  });

  withTime.sort((a, b) => (a.preferred_time_from || '').localeCompare(b.preferred_time_from || ''));
  withTime.forEach((e) => {
    const slot = e.preferred_time_from!;
    if (!groups.has(slot)) groups.set(slot, []);
    groups.get(slot)!.push({ type: 'waitlist', data: e });
  });

  if (noTime.length > 0) {
    const key = 'zzz_no_pref';
    groups.set(key, noTime.map((e) => ({ type: 'waitlist' as const, data: e })));
  }

  // Sort groups by key
  const sorted = new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
  return sorted;
}

function ColumnHeader() {
  return (
    <div className={cn(GRID_COLS, "px-4 pb-2 pt-1 sticky top-0 z-20 bg-card border-b border-border")}>
      <span />
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Naam</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pers</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tafel</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Shift / Ticket</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dieet</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Acties</span>
      <span />
    </div>
  );
}

export function ReservationListView({
  reservations,
  waitlistEntries = [],
  onReservationClick,
  onStatusChange,
  onAssignTable,
  onInviteWaitlist,
  onCancelWaitlist,
  density = "compact",
}: ReservationListViewProps) {
  const mergedGroups = useMemo(
    () => buildMergedGroups(reservations, waitlistEntries),
    [reservations, waitlistEntries]
  );
  const isCompact = density === "compact";

  if (reservations.length === 0 && waitlistEntries.filter(e => e.status !== 'cancelled' && e.status !== 'booked').length === 0) {
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
      {Array.from(mergedGroups.entries()).map(([timeSlot, items]) => {
        const isNoPref = timeSlot === 'zzz_no_pref';
        const resCount = items.filter(i => i.type === 'reservation').length;
        const wlCount = items.filter(i => i.type === 'waitlist').length;

        return (
          <div key={timeSlot}>
            <div className={cn(
              "px-4 border-b border-border bg-muted/30 flex items-center gap-2",
              isCompact ? "py-1.5" : "py-2"
            )}>
              <span className={cn("font-semibold text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
                {isNoPref ? 'Geen tijdvoorkeur' : formatTime(timeSlot)}
              </span>
              {resCount > 0 && (
                <span className={cn("text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
                  ({resCount})
                </span>
              )}
              {wlCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  {wlCount} wachtlijst
                </span>
              )}
            </div>

            <div className={cn("divide-y", isCompact ? "divide-border/50" : "divide-border")}>
              {items.map((item) => {
                if (item.type === 'reservation') {
                  return (
                    <ReservationRow
                      key={item.data.id}
                      reservation={item.data}
                      onClick={() => onReservationClick?.(item.data)}
                      onStatusChange={onStatusChange}
                      onAssignTable={onAssignTable}
                      density={density}
                    />
                  );
                }
                return (
                  <WaitlistInlineRow
                    key={item.data.id}
                    entry={item.data}
                    onInvite={() => onInviteWaitlist?.(item.data.id)}
                    onCancel={() => onCancelWaitlist?.(item.data.id)}
                    isCompact={isCompact}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Waitlist inline row ──

const WAITLIST_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'pending' | 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Wachtend', variant: 'pending' },
  invited: { label: 'Uitgenodigd', variant: 'warning' },
  booked: { label: 'Geboekt', variant: 'success' },
  expired: { label: 'Verlopen', variant: 'error' },
  cancelled: { label: 'Geannuleerd', variant: 'error' },
};

function getCountdown(expiresAt: string): string | null {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}u ${mins % 60}m`;
}

function WaitlistInlineRow({
  entry,
  onInvite,
  onCancel,
  isCompact,
}: {
  entry: WaitlistEntryWithInvites;
  onInvite: () => void;
  onCancel: () => void;
  isCompact: boolean;
}) {
  const statusInfo = WAITLIST_STATUS_MAP[entry.status] ?? WAITLIST_STATUS_MAP.pending;
  const activeInvite = entry.invites.find((i) => i.status === 'sent' || i.status === 'pending');
  const countdown = activeInvite ? getCountdown(activeInvite.expires_at) : null;
  const timeRange = entry.preferred_time_from
    ? `${entry.preferred_time_from.slice(0, 5)}${entry.preferred_time_to ? `–${entry.preferred_time_to.slice(0, 5)}` : ''}`
    : null;

  return (
    <div
      className={cn(
        GRID_COLS,
        "px-4 transition-colors duration-150 group",
        "border-l-2 border-dashed border-amber-400 bg-amber-50/5 dark:bg-amber-950/10",
        isCompact ? "py-2" : "py-3",
      )}
    >
      {/* Status dot — amber */}
      <span className="inline-block rounded-full flex-shrink-0 h-2.5 w-2.5 bg-amber-400" />

      {/* Naam */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-foreground truncate text-sm">
          {entry.first_name} {entry.last_name}
        </span>
        <NestoBadge variant="outline" size="sm" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
          WACHTLIJST
        </NestoBadge>
      </div>

      {/* Personen */}
      <span className="text-sm tabular-nums font-medium text-foreground">{entry.party_size}p</span>

      {/* Tafel — n.v.t. */}
      <span className="text-sm text-muted-foreground">—</span>

      {/* Tijdvoorkeur */}
      <div className="flex items-center gap-1.5 min-w-0">
        {timeRange && (
          <span className="text-xs text-muted-foreground">{timeRange}</span>
        )}
      </div>

      {/* Dieet — leeg voor wachtlijst */}
      <span />

      {/* Status badge */}
      <div className="flex items-center gap-1.5">
        <NestoBadge variant={statusInfo.variant} size="sm">
          {statusInfo.label}
        </NestoBadge>
        {countdown && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{countdown}</span>
        )}
      </div>

      {/* Acties */}
      <div className="flex items-center justify-end gap-1 min-w-0">
        {entry.status === 'pending' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onInvite(); }}
                  className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Uitnodigen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Cancel */}
      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 transition-all"
        title="Annuleren"
      >
        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

// ── Reservation row (unchanged) ──

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
        reservation.status === "no_show" && "opacity-60",
        !reservation.table_id && "bg-warning/5"
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
        {isAiChannel(reservation.channel) && (
          <SparkleIndicator size="sm" label="Automatisch geboekt" />
        )}
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
      {reservation.table_id ? (
        <span className="text-sm text-muted-foreground truncate">{reservation.table_label || '—'}</span>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">—</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onAssignTable?.(reservation); }}
                  className="p-1 rounded-md text-warning hover:text-warning/80 hover:bg-warning/10 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Automatisch tafel toewijzen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
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

      {/* Dieet kolom */}
      <DietaryPills prefs={reservation.customer?.dietary_preferences} />

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
