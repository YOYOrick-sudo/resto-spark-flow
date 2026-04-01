import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
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

export function GuestChat({ manageToken, brandColor, inline = false }: GuestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      direction: 'inbound',
      content: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
    }]);

    try {
      const res = await fetch(`${BASE_URL}/webchat-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify({ manage_token: manageToken, content: text }),
      });
      const data = await res.json();
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
      // Replace temp message with real one
      if (data.message_id) {
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, id: data.message_id } : m
        ));
      }
    } catch {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen && !inline) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 rounded-2xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        Stel een vraag
        {messages.length > 0 && (
          <span
            className="ml-1 text-xs px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: brandColor }}
          >
            {messages.filter(m => m.direction === 'outbound').length}
          </span>
        )}
      </button>
    );
  }

  // Inline mode: skip the header/border wrapper
  const chatContent = (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="h-64 overflow-y-auto px-1 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">
            Stel gerust een vraag — we reageren zo snel mogelijk.
          </p>
        ) : (
          messages.map(msg => {
            const isGuest = msg.direction === 'inbound';
            return (
              <div key={msg.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div
                    className="px-3 py-2 rounded-2xl text-sm"
                    style={isGuest
                      ? { backgroundColor: '#f3f4f6', color: '#374151' }
                      : { backgroundColor: brandColor + '15', color: '#1a1a1a' }
                    }
                  >
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 px-1">{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Stel je vraag..."
          maxLength={2000}
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="p-2 rounded-xl text-white disabled:opacity-40 transition-colors"
          style={{ backgroundColor: brandColor }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </>
  );

  if (inline) return <div>{chatContent}</div>;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: brandColor + '10' }}
      >
        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <MessageCircle className="h-4 w-4" style={{ color: brandColor }} />
          Chat
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Sluiten
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">
            Stel gerust een vraag — we reageren zo snel mogelijk.
          </p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%]">
                <div
                  className="px-3 py-2 rounded-2xl text-sm"
                  style={msg.direction === 'outbound'
                    ? { backgroundColor: brandColor + '15', color: '#1a1a1a' }
                    : { backgroundColor: '#f3f4f6', color: '#374151' }
                  }
                >
                  {msg.content}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type je bericht..."
          maxLength={2000}
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="p-2 rounded-xl text-white disabled:opacity-40 transition-colors"
          style={{ backgroundColor: brandColor }}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
