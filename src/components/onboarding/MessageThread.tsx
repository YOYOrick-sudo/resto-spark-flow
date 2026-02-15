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
  const isOutbound = message.direction === 'outbound';

  // Strip HTML for preview
  const plainText = message.body_text || message.body_html.replace(/<[^>]+>/g, '');
  const isLong = plainText.length > 200;
  const preview = isLong && !expanded ? plainText.slice(0, 200) + '…' : plainText;

  return (
    <div
      className={`bg-card rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-border ${
        isOutbound ? 'border-l-2 border-l-primary' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        {isAgent && <AssistentIcon size={14} className="text-primary shrink-0" />}
        <span className="text-sm font-semibold text-foreground">
          {message.sender_name}
        </span>
        <span className="text-caption text-muted-foreground ml-auto">
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
          className="mt-1.5 inline-flex items-center gap-1 text-caption text-primary hover:text-primary-hover transition-colors duration-150"
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
