import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NestoButton } from '@/components/polar/NestoButton';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [handledBy, setHandledBy] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch conversation handled_by + claimed_by profile name
  useEffect(() => {
    if (!conversationId) return;
    supabase
      .from('conversations')
      .select('handled_by, claimed_by')
      .eq('id', conversationId)
      .single()
      .then(async ({ data }) => {
        setHandledBy(data?.handled_by || null);
        if (data?.claimed_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', data.claimed_by)
            .single();
          setOperatorName(profile?.name?.split(' ')[0] || 'Operator');
        } else {
          setOperatorName(null);
        }
      });
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCurrentOperatorName = async (): Promise<string> => {
    if (!context) return 'Operator';
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', context.user_id)
      .single();
    return data?.name?.split(' ')[0] || 'Operator';
  };

  const insertSystemMessage = async (content: string) => {
    if (!conversationId || !currentLocation) return;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      location_id: currentLocation.id,
      direction: 'system',
      content,
      message_type: 'system',
      channel: 'webchat',
      is_ai_generated: false,
      sent_by: context?.user_id || null,
    });
  };

  const handleTakeOver = async () => {
    if (!conversationId || !context) return;
    const name = await getCurrentOperatorName();
    await supabase
      .from('conversations')
      .update({
        handled_by: 'operator',
        claimed_by: context.user_id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
    await insertSystemMessage(`Overgenomen door ${name}`);
    setHandledBy('operator');
    setOperatorName(name);
    queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
  };

  const handleReturnToAi = async () => {
    if (!conversationId) return;
    await supabase
      .from('conversations')
      .update({
        handled_by: 'ai',
        claimed_by: null,
        claimed_at: null,
        status: 'active',
      })
      .eq('id', conversationId);
    await insertSystemMessage('Overgedragen aan de Assistent');
    setHandledBy('ai');
    setOperatorName(null);
    queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });

    // Check if last message was inbound → trigger AI response
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.direction === 'inbound' && currentLocation) {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        if (projectId) {
          await fetch(`https://${projectId}.supabase.co/functions/v1/ai-respond`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ conversation_id: conversationId, location_id: currentLocation.id }),
          });
        }
      } catch {
        // Non-critical — AI will pick up on next message
      }
    }
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
            {isAiHandled ? 'Assistent actief' : (operatorName || 'Operator')}
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
            // System messages — render as timeline event
            if (msg.direction === 'system' || msg.message_type === 'system') {
              return (
                <div key={msg.id} className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {msg.content}
                    {msg.created_at && ` · ${format(new Date(msg.created_at), 'HH:mm', { locale: nl })}`}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }

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
