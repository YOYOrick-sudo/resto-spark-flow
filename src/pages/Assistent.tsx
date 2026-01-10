import { useState, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { EmptyState } from '@/components/polar/EmptyState';
import { AssistantFilters, AssistantItemCard } from '@/components/assistant';
import { mockAssistantItems } from '@/data/assistantMockData';
import { AssistantItem, AssistantModule, AssistantSeverity } from '@/types/assistant';

const SEVERITY_ORDER: Record<AssistantSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  ok: 3,
};

function sortItems(items: AssistantItem[]): AssistantItem[] {
  return [...items].sort((a, b) => {
    // Priority first (undefined naar einde)
    const aPriority = a.priority ?? Infinity;
    const bPriority = b.priority ?? Infinity;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Then severity
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // Then newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function Assistent() {
  const [activeModule, setActiveModule] = useState<AssistantModule | 'all'>('all');
  const [onlyActionable, setOnlyActionable] = useState(false);

  const filteredAndSortedItems = useMemo(() => {
    let items = mockAssistantItems;

    // Filter by module
    if (activeModule !== 'all') {
      items = items.filter((item) => item.module === activeModule);
    }

    // Filter by actionable
    if (onlyActionable) {
      items = items.filter((item) => item.actionable === true);
    }

    // Sort
    return sortItems(items);
  }, [activeModule, onlyActionable]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistent"
        subtitle="Signalen en inzichten op basis van je data"
      />

      <AssistantFilters
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onlyActionable={onlyActionable}
        onOnlyActionableChange={setOnlyActionable}
      />

      {filteredAndSortedItems.length > 0 ? (
        <div className="space-y-2">
          {filteredAndSortedItems.map((item) => (
            <AssistantItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="Geen actieve signalen"
          description="Alles ziet er goed uit. Geen nieuws is goed nieuws."
        />
      )}
    </div>
  );
}
