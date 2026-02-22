import { SignalModule, SIGNAL_MODULE_CONFIGS } from '@/types/signals';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AssistantFiltersProps {
  activeModule: SignalModule | 'all';
  onModuleChange: (module: SignalModule | 'all') => void;
  onlyActionable: boolean;
  onOnlyActionableChange: (value: boolean) => void;
  totalCount: number;
  filteredCount: number;
  availableModules: Set<SignalModule>;
}

export function AssistantFilters({
  activeModule,
  onModuleChange,
  onlyActionable,
  onOnlyActionableChange,
  totalCount,
  filteredCount,
  availableModules,
}: AssistantFiltersProps) {
  // Show 'Alle' + modules that have signals or are currently selected
  const visibleModules = SIGNAL_MODULE_CONFIGS.filter(
    (m) => m.value === 'all' || availableModules.has(m.value as SignalModule) || activeModule === m.value
  );

  return (
    <div className="bg-secondary/50 rounded-card border border-border/50 p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {visibleModules.map((module) => {
            const isSelected = activeModule === module.value;
            
            return (
              <button
                key={module.value}
                type="button"
                onClick={() => onModuleChange(module.value as SignalModule | 'all')}
                className={cn(
                  "px-3 py-1.5 text-small font-medium rounded-button transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {module.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="only-actionable"
              checked={onlyActionable}
              onCheckedChange={onOnlyActionableChange}
            />
            <Label htmlFor="only-actionable" className="text-sm text-muted-foreground cursor-pointer">
              Alleen actie
            </Label>
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredCount === totalCount 
              ? `${totalCount} signalen`
              : `${filteredCount} van ${totalCount} signalen`
            }
          </span>
        </div>
      </div>
    </div>
  );
}
