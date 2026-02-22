import { Trash2 } from 'lucide-react';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoButton } from '@/components/polar/NestoButton';
import type { FilterCondition } from '@/hooks/useMarketingSegments';

const FIELD_OPTIONS = [
  { value: 'total_visits', label: 'Aantal bezoeken' },
  { value: 'days_since_last_visit', label: 'Dagen sinds laatste bezoek' },
  { value: 'average_spend', label: 'Gemiddelde besteding' },
  { value: 'no_show_count', label: 'No-shows' },
  { value: 'birthday_month', label: 'Verjaardagsmaand' },
  { value: 'tags', label: 'Tags (bevat)' },
  { value: 'dietary_preferences', label: 'Dieetvoorkeur (bevat)' },
];

const NUMERIC_OPERATORS = [
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
];

const COMPARE_OPERATORS = [
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
];

const CONTAINS_OPERATORS = [
  { value: 'contains', label: 'bevat' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2024, i, 1).toLocaleString('nl-NL', { month: 'long' }),
}));

function getOperatorsForField(field: string) {
  switch (field) {
    case 'total_visits':
      return NUMERIC_OPERATORS;
    case 'days_since_last_visit':
    case 'average_spend':
    case 'no_show_count':
      return COMPARE_OPERATORS;
    case 'birthday_month':
      return [{ value: 'eq', label: '=' }];
    case 'tags':
    case 'dietary_preferences':
      return CONTAINS_OPERATORS;
    default:
      return NUMERIC_OPERATORS;
  }
}

interface ConditionRowProps {
  condition: FilterCondition;
  onChange: (updated: FilterCondition) => void;
  onRemove: () => void;
}

export function ConditionRow({ condition, onChange, onRemove }: ConditionRowProps) {
  const operators = getOperatorsForField(condition.field);
  const isMonthField = condition.field === 'birthday_month';
  const isTextContains = condition.field === 'tags' || condition.field === 'dietary_preferences';

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 min-w-[140px]">
        <NestoSelect
          size="sm"
          placeholder="Veld"
          value={condition.field}
          onValueChange={(v) => {
            const ops = getOperatorsForField(v);
            onChange({ field: v, operator: ops[0]?.value ?? 'gte', value: '' });
          }}
          options={FIELD_OPTIONS}
        />
      </div>
      <div className="w-[80px]">
        <NestoSelect
          size="sm"
          placeholder="Op"
          value={condition.operator}
          onValueChange={(v) => onChange({ ...condition, operator: v })}
          options={operators}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        {isMonthField ? (
          <NestoSelect
            size="sm"
            placeholder="Maand"
            value={String(condition.value)}
            onValueChange={(v) => onChange({ ...condition, value: parseInt(v) })}
            options={MONTH_OPTIONS}
          />
        ) : (
          <NestoInput
            type={isTextContains ? 'text' : 'number'}
            placeholder={isTextContains ? 'Waarde...' : '0'}
            className="h-8 text-xs"
            value={String(condition.value)}
            onChange={(e) =>
              onChange({
                ...condition,
                value: isTextContains ? e.target.value : (e.target.value ? Number(e.target.value) : 0),
              })
            }
          />
        )}
      </div>
      <NestoButton variant="ghost" size="icon" onClick={onRemove} className="shrink-0">
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </NestoButton>
    </div>
  );
}
