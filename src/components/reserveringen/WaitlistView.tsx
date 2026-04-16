import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Clock, Users, X, Mail } from 'lucide-react';
import { useWaitlistEntries, useCancelWaitlistEntry, type WaitlistEntryWithInvites } from '@/hooks/useWaitlistEntries';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar';
import { NestoButton } from '@/components/polar/NestoButton';
import { nestoToast } from '@/lib/nestoToast';

interface WaitlistViewProps {
  selectedDate: Date;
}

function getStatusBadge(entry: WaitlistEntryWithInvites) {
  const latestInvite = entry.invites
    .filter((i) => i.status === 'sent')
    .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];

  switch (entry.status) {
    case 'pending':
      return <NestoBadge variant="warning">Wachtend</NestoBadge>;
    case 'invited': {
      if (latestInvite) {
        const expiresAt = new Date(latestInvite.expires_at);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        if (diffMs > 0) {
          const mins = Math.floor(diffMs / 60000);
          return (
            <NestoBadge variant="primary">
              Uitgenodigd · {mins}m
            </NestoBadge>
          );
        }
      }
      return <NestoBadge variant="primary">Uitgenodigd</NestoBadge>;
    }
    case 'converted':
      return <NestoBadge variant="success">Geboekt</NestoBadge>;
    case 'expired':
      return <NestoBadge variant="default">Verlopen</NestoBadge>;
    case 'cancelled':
      return <NestoBadge variant="default">Geannuleerd</NestoBadge>;
    default:
      return <NestoBadge variant="default">{entry.status}</NestoBadge>;
  }
}

function formatTimePreference(entry: WaitlistEntryWithInvites) {
  if (entry.preferred_time_from && entry.preferred_time_to) {
    return `${entry.preferred_time_from.slice(0, 5)} – ${entry.preferred_time_to.slice(0, 5)}`;
  }
  return 'Geen voorkeur';
}

export function WaitlistView({ selectedDate }: WaitlistViewProps) {
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const { data: entries = [], isLoading } = useWaitlistEntries(dateString);
  const cancelEntry = useCancelWaitlistEntry();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEntries = useMemo(() => {
    if (statusFilter === 'all') return entries;
    return entries.filter((e) => e.status === statusFilter);
  }, [entries, statusFilter]);

  const handleCancel = (entry: WaitlistEntryWithInvites) => {
    cancelEntry.mutate(entry.id, {
      onSuccess: () => {},
      onError: (err) => nestoToast.error(`Fout: ${err.message}`),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 px-1">
        {['all', 'pending', 'invited', 'converted', 'expired'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            {s === 'all' ? 'Alles' : s === 'pending' ? 'Wachtend' : s === 'invited' ? 'Uitgenodigd' : s === 'converted' ? 'Geboekt' : 'Verlopen'}
            {s !== 'all' && (
              <span className="ml-1 opacity-60">
                ({entries.filter((e) => e.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={Clock}
            title="Geen wachtlijst-entries"
            description={entries.length === 0 ? 'Er zijn nog geen gasten op de wachtlijst voor deze dag.' : 'Geen entries voor deze filter.'}
          />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 py-3 px-4 hover:bg-secondary/30 transition-colors"
            >
              {/* Name & info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground truncate">
                    {entry.first_name} {entry.last_name}
                  </span>
                  {getStatusBadge(entry)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {entry.party_size}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimePreference(entry)}
                  </span>
                  {entry.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {entry.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="text-xs text-muted-foreground text-center shrink-0">
                <span className="font-mono">{entry.priority_score}</span>
                <span className="block text-[10px]">score</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {entry.status === 'pending' && (
                  <NestoButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(entry)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Annuleren"
                  >
                    <X className="w-4 h-4" />
                  </NestoButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
