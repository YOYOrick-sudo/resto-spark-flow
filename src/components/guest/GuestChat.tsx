import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: string;
  created_at: string;
}

interface GuestChatProps {
  manageToken: string;
  brandColor: string;
  restaurantName?: string;
  inline?: boolean;
}

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Zojuist';
  if (mins < 60) return `${mins} min geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Gisteren';
  return `${days} dagen geleden`;
}

export function GuestChat({ manageToken, brandColor, restaurantName = 'Restaurant', inline = false }: GuestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages
  useEffect(() => {
    fetch(`${BASE_URL}/webchat-messages?token=${encodeURIComponent(manageToken)}`, {
      headers: { 'apikey': API_KEY },
    })
      .then(r => r.json())
      .then(d => {
        setMessages(d.messages || []);
        setConversationId(d.conversation_id || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [manageToken]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`webchat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, {
              id: msg.id,
              direction: msg.direction,
              content: msg.content,
              message_type: msg.message_type,
              created_at: msg.created_at,
            }];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, direction: 'inbound', content: text,
      message_type: 'text', created_at: new Date().toISOString(),
    }]);

    try {
      const res = await fetch(`${BASE_URL}/webchat-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify({ manage_token: manageToken, content: text }),
      });
      const data = await res.json();
      if (data.conversation_id && !conversationId) setConversationId(data.conversation_id);
      if (data.message_id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.message_id } : m));
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter(m => m.direction === 'outbound').length;

  // Inline mode: input-first, expandable
  if (inline) {
    return (
      <div>
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: '#6B7280' }}>
            Heb je een vraag?
          </p>
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            </button>
          )}
        </div>

        {!isExpanded ? (
          /* Collapsed: just the input */
          <div
            className="flex items-center gap-2 cursor-text"
            onClick={() => { setIsExpanded(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          >
            <div
              className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-all hover:border-gray-300"
              style={{ borderColor: '#E5E7EB', color: '#9CA3AF' }}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Stel je vraag...</span>
            </div>
            {unreadCount > 0 && (
              <span
                className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >
                {unreadCount}
              </span>
            )}
          </div>
        ) : (
          /* Expanded: full chat */
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Messages */}
            <div ref={scrollRef} className="max-h-72 overflow-y-auto py-3 space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#D1D5DB' }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    Heb je een vraag over je reservering? We helpen je graag!
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  const isGuest = msg.direction === 'inbound';
                  return (
                    <div key={msg.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%]">
                        <div
                          className="px-3.5 py-2.5 text-sm"
                          style={isGuest
                            ? { backgroundColor: '#F3F4F6', color: '#374151', borderRadius: '16px 16px 6px 16px' }
                            : { backgroundColor: brandColor + '0D', color: '#1A1A1A', borderRadius: '16px 16px 16px 6px' }
                          }
                        >
                          {msg.content}
                        </div>
                        <p className="text-[10px] mt-0.5 px-1" style={{ color: '#9CA3AF' }}>
                          {timeAgo(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 pt-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type je bericht..."
                maxLength={2000}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                style={{ borderColor: '#E5E7EB' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-colors"
                style={{ backgroundColor: brandColor }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-inline legacy mode (kept for backwards compat)
  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className="w-full py-3 rounded-2xl text-sm font-medium border text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      style={{ borderColor: '#E5E7EB' }}
    >
      <MessageCircle className="h-4 w-4" />
      Stel een vraag
    </button>
  );
}
