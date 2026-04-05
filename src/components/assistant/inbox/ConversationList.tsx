import { useState } from 'react';
import { MessageSquare, Globe, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { useConversations, type ConversationItem } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

type Filter = 'all' | 'active' | 'escalated' | 'closed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'active', label: 'Actief' },
  { id: 'escalated', label: 'Escalaties' },
  { id: 'closed', label: 'Afgehandeld' },
];

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string, customerId: string | null) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const { conversations, isLoading } = useConversations(filter);

  const filtered = search
    ? conversations.filter((c) => {
        const q = search.toLowerCase();
        const name = c.customer
          ? `${c.customer.first_name} ${c.customer.last_name}`.toLowerCase()
          : '';
        return name.includes(q) || (c.lastMessage || '').toLowerCase().includes(q);
      })
    : conversations;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoeken..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-3 py-2 border-b border-border">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium transition-colors',
              filter === f.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Geen gesprekken</p>
        ) : (
          filtered.map((conv) => (
            <ConversationRow
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onClick={() => onSelect(conv.id, conv.customer?.first_name ? (conv as any).customer_id || null : null)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation: conv,
  isSelected,
  onClick,
}: {
  conversation: ConversationItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const name = conv.customer
    ? `${conv.customer.first_name} ${conv.customer.last_name}`
    : conv.customer?.phone_number || 'Onbekend';

  const isUnread = (conv.unread_count || 0) > 0;

  const timeAgo = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: nl })
    : '';

  const ChannelIcon = conv.channel === 'whatsapp' ? MessageSquare : Globe;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b border-border/50',
        isSelected ? 'bg-accent/40' : 'hover:bg-accent/20',
        isUnread && 'font-medium'
      )}
    >
      <ChannelIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', isUnread ? 'text-foreground font-medium' : 'text-foreground')}>
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {conv.lastMessage ? conv.lastMessage.slice(0, 50) : 'Geen berichten'}
          </p>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
        {conv.handled_by === 'operator' && (
          <span className="text-[10px] text-warning">⚠️ Escalatie</span>
        )}
        {conv.handled_by === 'ai' && (
          <span className="text-[10px] text-muted-foreground">🤖 Assistent</span>
        )}
      </div>
    </button>
  );
}
