import { useState } from 'react';
import { ChevronDown, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { useWaitlistEntries, useCancelWaitlistEntry, type WaitlistEntryWithInvites } from '@/hooks/useWaitlistEntries';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface WaitlistSectionProps {
  selectedDate: Date;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' }> = {
  pending: { label: 'Wachtend', variant: 'secondary' },
  invited: { label: 'Uitgenodigd', variant: 'warning' },
  booked: { label: 'Geboekt', variant: 'success' },
  expired: { label: 'Verlopen', variant: 'destructive' },
  cancelled: { label: 'Geannuleerd', variant: 'destructive' },
};

export function WaitlistSection({ selectedDate }: WaitlistSectionProps) {
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const { data: entries = [] } = useWaitlistEntries(dateString);
  const cancelEntry = useCancelWaitlistEntry();
  const [open, setOpen] = useState(false);

  const activeEntries = entries.filter((e) => e.status !== 'cancelled');
  if (activeEntries.length === 0) return null;

  return (
    <div className="border-t border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-muted/50 transition-colors">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Wachtlijst</span>
          <NestoBadge variant="secondary" className="text-xs px-1.5 py-0">
            {activeEntries.length}
          </NestoBadge>
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform', open && 'rotate-180')} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-1">
            {activeEntries.map((entry) => (
              <WaitlistRow key={entry.id} entry={entry} onCancel={() => cancelEntry.mutate(entry.id)} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function WaitlistRow({ entry, onCancel }: { entry: WaitlistEntryWithInvites; onCancel: () => void }) {
  const statusInfo = STATUS_MAP[entry.status] ?? STATUS_MAP.pending;
  const timeRange = entry.preferred_time_from
    ? `${entry.preferred_time_from.slice(0, 5)}${entry.preferred_time_to ? `–${entry.preferred_time_to.slice(0, 5)}` : ''}`
    : null;

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors group">
      <span className="text-sm font-medium text-foreground truncate">
        {entry.first_name} {entry.last_name}
      </span>
      <span className="text-xs text-muted-foreground">{entry.party_size}p</span>
      {timeRange && <span className="text-xs text-muted-foreground">{timeRange}</span>}
      <NestoBadge variant={statusInfo.variant} className="text-xs ml-auto">
        {statusInfo.label}
      </NestoBadge>
      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all"
        title="Annuleren"
      >
        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
