import { useState } from 'react';
import { formatDateTimeCompact } from '@/lib/datetime';
import { AssistentIcon } from '@/components/icons/AssistentIcon';
import { EmptyState } from '@/components/polar/EmptyState';
import { Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  id: string;
  direction: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  triggered_by: string;
  created_at: string;
}

interface MessageThreadProps {
  messages: Message[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  if (!messages || messages.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="Geen berichten"
        description="Er zijn nog geen berichten verstuurd naar deze kandidaat."
      />
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false);
  const isAgent = message.triggered_by === 'agent';
  const isInbound = message.direction === 'inbound';

  // Strip HTML for preview
  const plainText = message.body_text || message.body_html.replace(/<[^>]+>/g, '');
  const isLong = plainText.length > 200;
  const preview = isLong && !expanded ? plainText.slice(0, 200) + '…' : plainText;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isInbound
          ? 'border-border bg-secondary/50'
          : 'border-primary/20 bg-primary/[0.03]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        {isAgent && <AssistentIcon size={14} className="text-primary shrink-0" />}
        <span className="text-sm font-medium text-foreground">
          {message.sender_name}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDateTimeCompact(message.created_at)}
        </span>
      </div>

      {/* Subject */}
      <p className="text-sm font-semibold text-foreground mb-1">{message.subject}</p>

      {/* Body */}
      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {preview}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <>Minder tonen <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Meer tonen <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
