import { useState, useEffect, useMemo } from 'react';
import { Plus, Users } from 'lucide-react';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ConditionRow } from './ConditionRow';
import { useSegmentPreview } from '@/hooks/useSegmentPreview';
import type { FilterRules, FilterCondition, MarketingSegment } from '@/hooks/useMarketingSegments';

interface SegmentBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment?: MarketingSegment | null;
  onSave: (data: { name: string; description?: string; filter_rules: FilterRules }) => void;
  isSaving?: boolean;
}

const DEFAULT_CONDITION: FilterCondition = { field: 'total_visits', operator: 'gte', value: 1 };

export function SegmentBuilderModal({ open, onOpenChange, segment, onSave, isSaving }: SegmentBuilderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<FilterCondition[]>([{ ...DEFAULT_CONDITION }]);

  useEffect(() => {
    if (segment) {
      setName(segment.name);
      setDescription(segment.description ?? '');
      setLogic(segment.filter_rules?.logic ?? 'AND');
      setConditions(segment.filter_rules?.conditions?.length ? segment.filter_rules.conditions : [{ ...DEFAULT_CONDITION }]);
    } else {
      setName('');
      setDescription('');
      setLogic('AND');
      setConditions([{ ...DEFAULT_CONDITION }]);
    }
  }, [segment, open]);

  const filterRules = useMemo<FilterRules>(() => ({ conditions, logic }), [conditions, logic]);
  const { data: previewCount, isLoading: previewLoading } = useSegmentPreview(
    conditions.length > 0 && conditions.every(c => c.value !== '') ? filterRules : null
  );

  const updateCondition = (index: number, updated: FilterCondition) => {
    setConditions(prev => prev.map((c, i) => (i === index ? updated : c)));
  };

  const removeCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, filter_rules: filterRules });
  };

  const isReadonly = segment?.is_system ?? false;

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title={segment ? (isReadonly ? segment.name : 'Segment bewerken') : 'Nieuw segment'}
      size="lg"
      footer={
        !isReadonly && (
          <div className="flex justify-end gap-3">
            <NestoButton variant="outline" onClick={() => onOpenChange(false)}>Annuleren</NestoButton>
            <NestoButton onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </NestoButton>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* Name + description */}
        <div className="space-y-3">
          <NestoInput
            label="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Trouwe gasten"
            disabled={isReadonly}
          />
          <NestoInput
            label="Beschrijving"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionele beschrijving..."
            disabled={isReadonly}
          />
        </div>

        {/* Separator */}
        <div className="border-t border-border/50 pt-4 mt-4">
          {/* Logic toggle */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-label text-muted-foreground">Combinatie:</span>
            <RadioGroup
              value={logic}
              onValueChange={(v) => setLogic(v as 'AND' | 'OR')}
              className="flex gap-4"
              disabled={isReadonly}
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="AND" id="logic-and" />
                <Label htmlFor="logic-and" className="text-body">Alle (AND)</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="OR" id="logic-or" />
                <Label htmlFor="logic-or" className="text-body">Eén van (OR)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            {conditions.map((cond, i) => (
              <ConditionRow
                key={i}
                condition={cond}
                onChange={(updated) => updateCondition(i, updated)}
                onRemove={() => removeCondition(i)}
              />
            ))}
          </div>

          {!isReadonly && (
            <NestoButton
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setConditions(prev => [...prev, { ...DEFAULT_CONDITION }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Conditie toevoegen
            </NestoButton>
          )}
        </div>

        {/* Live preview */}
        <div className="border-t border-border/50 pt-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Dit segment bevat</span>
            <NestoBadge variant="primary">
              {previewLoading ? '...' : (previewCount ?? 0)}
            </NestoBadge>
            <span className="text-muted-foreground">gasten</span>
          </div>
        </div>
      </div>
    </NestoModal>
  );
}
