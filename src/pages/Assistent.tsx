import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AssistentIcon } from '@/components/icons/AssistentIcon';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoTabs, NestoTabContent } from '@/components/polar/NestoTabs';
import { Spinner } from '@/components/polar/LoadingStates';
import { OverviewTab } from '@/components/assistant/OverviewTab';
import { MessagesTab } from '@/components/assistant/MessagesTab';
import { useConversations } from '@/hooks/useConversations';
import { useAgentActions } from '@/hooks/useAgentActions';

export default function Assistent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overzicht';

  const { conversations } = useConversations();
  const { pendingActions } = useAgentActions();

  const unreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  const tabs = useMemo(() => [
    { id: 'overzicht', label: 'Overzicht', count: pendingActions.length || undefined },
    { id: 'berichten', label: 'Berichten', count: unreadCount || undefined },
  ], [unreadCount, pendingActions.length]);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistent"
        subtitle="Regelt het, zodat jij kunt koken"
        actions={<AssistentIcon size={24} className="text-primary" />}
      />

      <NestoTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <NestoTabContent value="overzicht" activeValue={activeTab}>
        <OverviewTab />
      </NestoTabContent>

      <NestoTabContent value="berichten" activeValue={activeTab}>
        <MessagesTab />
      </NestoTabContent>
    </div>
  );
}
