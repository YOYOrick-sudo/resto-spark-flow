import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Eye, EyeOff, Bot, Clock, Globe, MessageSquare } from 'lucide-react';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoTabs, NestoTabContent } from '@/components/polar/NestoTabs';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoModal } from '@/components/polar/NestoModal';
import { EmptyState } from '@/components/polar/EmptyState';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useKnowledgeBase, type KnowledgeBaseEntry, type KnowledgeBaseInput } from '@/hooks/useKnowledgeBase';
import { KnowledgeBaseTab } from '@/components/settings/assistant/KnowledgeBaseTab';
import { AgentConfigTab } from '@/components/settings/assistant/AgentConfigTab';

const TABS = [
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'agent', label: 'AI Assistent' },
];

export default function SettingsAssistent() {
  const [activeTab, setActiveTab] = useState('knowledge');

  return (
    <SettingsDetailLayout
      title="Assistent"
      description="Beheer de AI-kennis en autonomie-instellingen voor je restaurant."
      breadcrumbs={[
        { label: 'Instellingen', path: '/instellingen/voorkeuren' },
        { label: 'Assistent' },
      ]}
    >
      <NestoTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <NestoTabContent value="knowledge" activeValue={activeTab}>
        <KnowledgeBaseTab />
      </NestoTabContent>

      <NestoTabContent value="agent" activeValue={activeTab}>
        <AgentConfigTab />
      </NestoTabContent>
    </SettingsDetailLayout>
  );
}
