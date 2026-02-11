import { useState } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TaskTemplateList } from './TaskTemplateList';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Tables, Json } from '@/integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskTemplate {
  title: string;
  description?: string;
  assigned_role?: string | null;
  is_automated?: boolean;
}

interface PhaseConfigCardProps {
  phase: Tables<'onboarding_phases'>;
  index: number;
  onUpdate: (updates: { is_active?: boolean; description?: string | null; task_templates?: Json }) => void;
  onExplicitAction?: () => void;
}

export function PhaseConfigCard({ phase, index, onUpdate, onExplicitAction }: PhaseConfigCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tasks = (phase.task_templates as unknown as TaskTemplate[]) || [];

  const debouncedDescriptionUpdate = useDebouncedCallback((value: string) => {
    onUpdate({ description: value || null });
  }, 800);

  return (
    <NestoCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">{index + 1}.</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-sm font-semibold truncate">{phase.name}</h3>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{phase.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-2">
            <Textarea
              defaultValue={phase.description || ''}
              onChange={(e) => debouncedDescriptionUpdate(e.target.value)}
              placeholder="Beschrijving van deze fase..."
              className="min-h-[60px] text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Label htmlFor={`phase-active-${phase.id}`} className="text-xs text-muted-foreground">
            Actief
          </Label>
          <Switch
            id={`phase-active-${phase.id}`}
            checked={phase.is_active}
            onCheckedChange={(val) => onUpdate({ is_active: val })}
          />
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1 rounded-button outline-none"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="tabular-nums">{tasks.length} taken</span>
      </button>

      {expanded && (
        <div className="mt-3 pl-5">
          <TaskTemplateList
            tasks={tasks}
            onChange={(newTasks) => onUpdate({ task_templates: newTasks as unknown as Json })}
            onExplicitAction={onExplicitAction}
          />
        </div>
      )}
    </NestoCard>
  );
}
