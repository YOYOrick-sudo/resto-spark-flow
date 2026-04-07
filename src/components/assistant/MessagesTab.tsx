import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConversationList } from './inbox/ConversationList';
import { ChatView } from './inbox/ChatView';
import { GuestProfile } from './inbox/GuestProfile';
import { supabase } from '@/integrations/supabase/client';

export function MessagesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Read conversation param from URL on mount / change
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversationId !== selectedConversationId) {
      setSelectedConversationId(conversationId);
      // Fetch customer_id for this conversation
      supabase
        .from('conversations')
        .select('customer_id')
        .eq('id', conversationId)
        .single()
        .then(({ data }) => {
          if (data?.customer_id) {
            setSelectedCustomerId(data.customer_id);
          }
        });
      // Clean conversation param from URL to avoid stale state
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('conversation');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  return (
    <div className="flex gap-0 border border-border rounded-xl overflow-hidden bg-card" style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>
      {/* Left: Conversation List */}
      <div className="w-[280px] border-r border-border flex-shrink-0 overflow-hidden">
        <ConversationList
          selectedId={selectedConversationId}
          onSelect={(id, customerId) => {
            setSelectedConversationId(id);
            setSelectedCustomerId(customerId);
          }}
        />
      </div>

      {/* Middle: Chat */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ChatView conversationId={selectedConversationId} />
      </div>

      {/* Right: Guest Profile */}
      <div className="w-[260px] border-l border-border flex-shrink-0 overflow-hidden">
        <GuestProfile customerId={selectedCustomerId} />
      </div>
    </div>
  );
}
