import { AssistantModule } from '@/types/assistant';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AssistantFiltersProps {
  activeModule: AssistantModule | 'all';
  onModuleChange: (module: AssistantModule | 'all') => void;
  onlyActionable: boolean;
  onOnlyActionableChange: (value: boolean) => void;
  totalCount: number;
  filteredCount: number;
}

const modules: { value: AssistantModule | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'reserveringen', label: 'Reserveringen' },
  { value: 'keuken', label: 'Keuken' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'configuratie', label: 'Configuratie' },
];

export function AssistantFilters({
  activeModule,
  onModuleChange,
  onlyActionable,
  onOnlyActionableChange,
  totalCount,
  filteredCount,
}: AssistantFiltersProps) {
  return (
    <div className="bg-secondary/50 rounded-card border border-border/50 p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Module Filter Pills - Subtle outline style */}
        <div className="flex items-center gap-2 flex-wrap">
          {modules.map((module) => {
            const isSelected = activeModule === module.value;
            
            return (
              <button
                key={module.value}
                type="button"
                onClick={() => onModuleChange(module.value)}
                className={cn(
                  "px-3 py-1.5 text-[13px] font-medium rounded-button transition-all duration-200",
                  "border-[1.5px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {module.label}
              </button>
            );
          })}
        </div>

        {/* Right side: Toggle + Counter */}
        <div className="flex items-center gap-4">
          {/* Actionable Toggle */}
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

          {/* Result Counter */}
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
