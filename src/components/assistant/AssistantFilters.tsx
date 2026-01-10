import { AssistantModule } from '@/types/assistant';
import { NestoButton } from '@/components/polar/NestoButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AssistantFiltersProps {
  activeModule: AssistantModule | 'all';
  onModuleChange: (module: AssistantModule | 'all') => void;
  onlyActionable: boolean;
  onOnlyActionableChange: (value: boolean) => void;
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
}: AssistantFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Module Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {modules.map((module) => (
          <NestoButton
            key={module.value}
            variant={activeModule === module.value ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onModuleChange(module.value)}
          >
            {module.label}
          </NestoButton>
        ))}
      </div>

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
    </div>
  );
}
