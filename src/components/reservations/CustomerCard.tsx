import { useState } from 'react';
import { Mail, Phone, UserPlus, CalendarDays, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReservationsByCustomer } from '@/hooks/useReservationsByCustomer';
import { STATUS_CONFIG } from '@/types/reservation';
import type { Customer } from '@/types/reservation';
import { formatDateShort } from '@/lib/datetime';
import { formatTime } from '@/lib/reservationUtils';

interface CustomerCardProps {
  customer?: Customer;
  reservationId: string;
  className?: string;
}

export function CustomerCard({ customer, reservationId, className }: CustomerCardProps) {
  if (!customer) {
    return (
      <div className={cn('p-5', className)}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Klantgegevens</h3>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">Geen klantgegevens gekoppeld</p>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button border border-input bg-background hover:bg-secondary transition-colors"
            onClick={() => {
              // TODO: open customer link dialog
            }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Klant koppelen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-5', className)}>
      <h3 className="text-sm font-semibold text-foreground mb-3">Klantgegevens</h3>

      {/* Contact info */}
      <div className="space-y-2 mb-4">
        <p className="text-base font-semibold text-foreground">
          {customer.first_name} {customer.last_name}
        </p>
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.phone_number && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{customer.phone_number}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-1.5 rounded-lg bg-muted/50">
          <p className="text-lg font-semibold text-foreground tabular-nums">{customer.total_visits}</p>
          <p className="text-xs text-muted-foreground">Bezoeken</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-muted/50">
          <p className={cn("text-lg font-semibold tabular-nums", customer.total_no_shows > 0 ? "text-destructive" : "text-foreground")}>
            {customer.total_no_shows}
          </p>
          <p className="text-xs text-muted-foreground">No-shows</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mt-1">Laatste bezoek</p>
          <p className="text-xs font-medium text-foreground">
            {customer.last_visit_at ? formatDateShort(customer.last_visit_at) : '—'}
          </p>
        </div>
      </div>

      {/* Visit history */}
      <VisitHistory customerId={customer.id} />

      {/* Notes */}
      {customer.notes && (
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Notities</p>
          <p className="text-sm text-foreground">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}

function VisitHistory({ customerId }: { customerId: string }) {
  const { data: visits = [], isLoading } = useReservationsByCustomer(customerId);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <p className="text-xs text-muted-foreground">Bezoekhistorie laden...</p>;
  if (visits.length === 0) return null;

  const displayVisits = showAll ? visits : visits.slice(0, 5);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Recente bezoeken</p>
      <div className="space-y-1.5">
        {displayVisits.map((v) => {
          const statusCfg = STATUS_CONFIG[v.status];
          return (
            <div key={v.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 flex-shrink-0" />
              <span>{formatDateShort(v.reservation_date)}</span>
              <span>•</span>
              <span className="tabular-nums">{v.party_size}p</span>
              {v.shift_name && <span className="text-foreground/60">{v.shift_name}</span>}
              {v.table_label && <span>T{v.table_label}</span>}
              {statusCfg && (
                <span className={cn('ml-auto', statusCfg.textClass)}>{statusCfg.label}</span>
              )}
            </div>
          );
        })}
      </div>
      {visits.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          <Eye className="h-3 w-3" />
          Toon alle {visits.length} bezoeken
        </button>
      )}
    </div>
  );
}
