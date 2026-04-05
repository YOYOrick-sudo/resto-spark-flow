import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NestoButton } from '@/components/polar/NestoButton';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ChatViewProps {
  conversationId: string | null;
}

function SparkleIndicator() {
  return <span className="text-primary text-[10px]" title="AI-gegenereerd">✦</span>;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { messages, isLoading, sendMessage } = useConversationMessages(conversationId);
  const { context, currentLocation } = useUserContext();
  const [input, setInput] = useState('');
  const [handledBy, setHandledBy] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch conversation handled_by
  useEffect(() => {
    if (!conversationId) return;
    supabase
      .from('conversations')
      .select('handled_by')
      .eq('id', conversationId)
      .single()
      .then(({ data }) => setHandledBy(data?.handled_by || null));
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTakeOver = async () => {
    if (!conversationId || !context) return;
    await supabase
      .from('conversations')
      .update({
        handled_by: 'operator',
        claimed_by: context.user_id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
    setHandledBy('operator');
  };

  const handleReturnToAi = async () => {
    if (!conversationId) return;
    await supabase
      .from('conversations')
      .update({
        handled_by: 'ai',
        claimed_by: null,
        claimed_at: null,
      })
      .eq('id', conversationId);
    setHandledBy('ai');
  };

  const handleSend = () => {
    if (!input.trim() || !context || !currentLocation) return;
    sendMessage.mutate({
      content: input.trim(),
      currentUserId: context.user_id,
      locationId: currentLocation.id,
    });
    setInput('');
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Selecteer een gesprek om te bekijken
      </div>
    );
  }

  const isAiHandled = handledBy === 'ai';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isAiHandled ? (
            <Bot className="h-4 w-4 text-primary" />
          ) : (
            <UserIcon className="h-4 w-4 text-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {isAiHandled ? 'Assistent actief' : context?.first_name || 'Operator'}
          </span>
        </div>
        <NestoButton
          size="sm"
          variant="outline"
          onClick={isAiHandled ? handleTakeOver : handleReturnToAi}
        >
          {isAiHandled ? '👤 Overnemen' : '🤖 Teruggeven aan Assistent'}
        </NestoButton>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div
                key={msg.id}
                className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[70%] px-4 py-2.5 text-sm',
                    isOutbound
                      ? 'bg-primary/10 text-foreground rounded-2xl rounded-br-md'
                      : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {msg.created_at
                        ? format(new Date(msg.created_at), 'HH:mm', { locale: nl })
                        : ''}
                    </span>
                    {msg.is_ai_generated && <SparkleIndicator />}
                    {isOutbound && msg.wa_status && (
                      <span className="text-[10px] text-muted-foreground">
                        {msg.wa_status === 'sent' && '✓'}
                        {msg.wa_status === 'delivered' && '✓✓'}
                        {msg.wa_status === 'read' && (
                          <span className="text-primary">✓✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        {isAiHandled ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Assistent beantwoordt dit gesprek. Klik &apos;Overnemen&apos; om zelf te antwoorden.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Typ een bericht..."
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <NestoButton
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending}
            >
              <Send className="h-4 w-4" />
            </NestoButton>
          </div>
        )}
      </div>
    </div>
  );
}
