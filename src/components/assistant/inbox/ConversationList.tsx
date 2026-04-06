import { MessageSquare, Globe, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SparkleIndicator } from '@/components/polar/SparkleIndicator';
import { useInboxConversations, type ConversationItem } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string, customerId: string | null) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { attention, recent, isLoading } = useInboxConversations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isEmpty = attention.length === 0 && recent.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
        <SparkleIndicator size="md" variant="muted" />
        <p className="text-sm text-muted-foreground">Geen actieve gesprekken.</p>
        <p className="text-xs text-muted-foreground">De assistent houdt het in de gaten.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Aandacht sectie */}
      {attention.length > 0 && (
        <>
          <div className="px-3 py-2 bg-warning/5 border-b border-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warning">
              Aandacht ({attention.length})
            </span>
          </div>
          {attention.map((conv) => (
            <AttentionRow
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onClick={() => onSelect(conv.id, conv.customer_id)}
            />
          ))}
        </>
      )}

      {/* Recent sectie */}
      <div className="px-3 py-2 border-b border-border">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent
        </span>
      </div>
      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Geen recente gesprekken</p>
      ) : (
        recent.map((conv) => (
          <RecentRow
            key={conv.id}
            conversation={conv}
            isSelected={conv.id === selectedId}
            onClick={() => onSelect(conv.id, null)}
          />
        ))
      )}
    </div>
  );
}

function AttentionRow({ conversation: conv, isSelected, onClick }: {
  conversation: ConversationItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const name = conv.customer
    ? `${conv.customer.first_name} ${conv.customer.last_name}`
    : 'Onbekend';

  const waitTime = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: nl })
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2.5 px-3 py-3 text-left transition-colors border-b border-border/50',
        isSelected ? 'bg-accent/40' : 'hover:bg-accent/20'
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{waitTime}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {conv.lastMessage ? conv.lastMessage.slice(0, 50) : 'Wacht op reactie'}
        </p>
      </div>
    </button>
  );
}

function RecentRow({ conversation: conv, isSelected, onClick }: {
  conversation: ConversationItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const name = conv.customer
    ? `${conv.customer.first_name} ${conv.customer.last_name}`
    : 'Onbekend';

  const timeAgo = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: nl })
    : '';

  const ChannelIcon = conv.channel === 'whatsapp' ? MessageSquare : Globe;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2.5 px-3 py-3 text-left transition-colors border-b border-border/50',
        isSelected ? 'bg-accent/40' : 'hover:bg-accent/20'
      )}
    >
      <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground truncate">{name}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            <SparkleIndicator size="sm" variant="muted" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {conv.lastMessage ? conv.lastMessage.slice(0, 50) : 'Geen berichten'}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
          <SparkleIndicator size="sm" variant="muted" /> Assistent
        </span>
      </div>
    </button>
  );
}
