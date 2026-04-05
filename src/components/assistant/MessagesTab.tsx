import { useState } from 'react';
import { ConversationList } from './inbox/ConversationList';
import { ChatView } from './inbox/ChatView';
import { GuestProfile } from './inbox/GuestProfile';

export function MessagesTab() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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
