import { useState, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { AssistentIcon } from '@/components/icons/AssistentIcon';
import { PageHeader } from '@/components/polar/PageHeader';
import { EmptyState } from '@/components/polar/EmptyState';
import { Spinner } from '@/components/polar/LoadingStates';
import { AssistantFilters, AssistantItemCard } from '@/components/assistant';
import { useSignals } from '@/hooks/useSignals';
import type { Signal, SignalModule, SignalSeverity } from '@/types/signals';

const SEVERITY_ORDER: Record<SignalSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  ok: 3,
};

function sortItems(items: Signal[]): Signal[] {
  return [...items].sort((a, b) => {
    const aPriority = a.priority ?? Infinity;
    const bPriority = b.priority ?? Infinity;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const severityDiff = (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2);
    if (severityDiff !== 0) return severityDiff;

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
  const [activeModule, setActiveModule] = useState<SignalModule | 'all'>('all');
  const [onlyActionable, setOnlyActionable] = useState(false);
  const { signals, isLoading, availableModules } = useSignals();

  const { filteredItems, actionableItems, informativeItems, totalCount } = useMemo(() => {
    let items = signals;

    if (activeModule !== 'all') {
      items = items.filter((item) => item.module === activeModule);
    }

    if (onlyActionable) {
      items = items.filter((item) => item.actionable === true);
    }

    const sorted = sortItems(items);
    const actionable = sorted.filter((item) => item.actionable === true);
    const informative = sorted.filter((item) => item.actionable !== true);

    return {
      filteredItems: sorted,
      actionableItems: actionable,
      informativeItems: informative,
      totalCount: signals.length,
    };
  }, [signals, activeModule, onlyActionable]);

  const showSections = !onlyActionable && actionableItems.length > 0 && informativeItems.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assistent"
          subtitle="Signalen en inzichten op basis van je data"
          actions={<AssistentIcon size={24} className="text-primary" />}
        />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistent"
        subtitle="Signalen en inzichten op basis van je data"
        actions={<AssistentIcon size={24} className="text-primary" />}
      />

      <AssistantFilters
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onlyActionable={onlyActionable}
        onOnlyActionableChange={setOnlyActionable}
        totalCount={totalCount}
        filteredCount={filteredItems.length}
        availableModules={availableModules}
      />

      {filteredItems.length > 0 ? (
        <div className="space-y-1">
          {showSections ? (
            <>
              <SectionHeader title="Aandacht vereist" count={actionableItems.length} />
              <div className="space-y-2">
                {actionableItems.map((item) => (
                  <AssistantItemCard key={item.id} item={item} />
                ))}
              </div>

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
