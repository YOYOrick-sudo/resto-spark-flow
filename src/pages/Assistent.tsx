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

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      <span className="text-xs text-muted-foreground/70">
        ({count})
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

export default function Assistent() {
  const [activeModule, setActiveModule] = useState<AssistantModule | 'all'>('all');
  const [onlyActionable, setOnlyActionable] = useState(false);

  const { filteredItems, actionableItems, informativeItems, totalCount } = useMemo(() => {
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
    const sorted = sortItems(items);

    // Split into actionable and informative
    const actionable = sorted.filter((item) => item.actionable === true);
    const informative = sorted.filter((item) => item.actionable !== true);

    return {
      filteredItems: sorted,
      actionableItems: actionable,
      informativeItems: informative,
      totalCount: mockAssistantItems.length,
    };
  }, [activeModule, onlyActionable]);

  const showSections = !onlyActionable && actionableItems.length > 0 && informativeItems.length > 0;

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
        totalCount={totalCount}
        filteredCount={filteredItems.length}
      />

      {filteredItems.length > 0 ? (
        <div className="space-y-1">
          {showSections ? (
            <>
              {/* Actionable Section */}
              <SectionHeader title="Aandacht vereist" count={actionableItems.length} />
              <div className="space-y-2">
                {actionableItems.map((item) => (
                  <AssistantItemCard key={item.id} item={item} />
                ))}
              </div>

              {/* Informative Section */}
              <SectionHeader title="Ter info" count={informativeItems.length} />
              <div className="space-y-2">
                {informativeItems.map((item) => (
                  <AssistantItemCard key={item.id} item={item} />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <AssistantItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="Alles onder controle"
          description="Er zijn geen openstaande signalen of insights. De assistent meldt zich als er iets is."
        />
      )}
    </div>
  );
}
