import { useState } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { ChevronDown, ChevronRight, Sparkles, Trash2 } from 'lucide-react';
import { TaskTemplateList } from './TaskTemplateList';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Tables, Json } from '@/integrations/supabase/types';

interface TaskTemplate {
  title: string;
  description?: string;
  assigned_role?: string | null;
  is_automated?: boolean;
}

interface PhaseConfigCardProps {
  phase: Tables<'onboarding_phases'> & {
    is_custom?: boolean;
    assistant_enabled?: boolean;
    phase_owner_name?: string | null;
  };
  index: number;
  onUpdate: (updates: {
    is_active?: boolean;
    name?: string;
    description?: string | null;
    task_templates?: Json;
    assistant_enabled?: boolean;
  }) => void;
  onDelete?: (phaseId: string) => void;
  onExplicitAction?: () => void;
  canDelete?: boolean;
}

export function PhaseConfigCard({ phase, index, onUpdate, onDelete, onExplicitAction, canDelete = true }: PhaseConfigCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const tasks = (phase.task_templates as unknown as TaskTemplate[]) || [];
  const assistantEnabled = (phase as any).assistant_enabled ?? false;
  const hasAutomatedTasks = tasks.some((t) => t.is_automated);

  const debouncedDescriptionUpdate = useDebouncedCallback((value: string) => {
    onUpdate({ description: value || null });
  }, 800);

  const debouncedNameUpdate = useDebouncedCallback((value: string) => {
    if (value.trim()) onUpdate({ name: value.trim() });
  }, 800);

  return (
    <NestoCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">{index + 1}.</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 min-w-0 text-left focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1 rounded-button outline-none"
            >
              {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
              <h3 className="text-sm font-semibold truncate">{phase.name}</h3>
            </button>
            {(assistantEnabled || hasAutomatedTasks) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <NestoBadge variant="primary" size="sm">Assistent</NestoBadge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Deze fase bevat taken die door de Nesto Assistent worden afgehandeld</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {(phase as any).is_custom && (
              <NestoBadge variant="outline" size="sm">Aangepast</NestoBadge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1 flex-shrink-0">
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

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Editable name */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Fase naam</Label>
            <Input
              defaultValue={phase.name}
              onChange={(e) => debouncedNameUpdate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Beschrijving</Label>
            <Textarea
              defaultValue={phase.description || ''}
              onChange={(e) => debouncedDescriptionUpdate(e.target.value)}
              placeholder="Beschrijving van deze fase..."
              className="min-h-[60px] text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Assistant toggle */}
          <div className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-card border border-border/40">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Assistent inschakelen</p>
                <p className="text-xs text-muted-foreground">Automatische taken in deze fase worden door de Assistent opgepakt</p>
              </div>
            </div>
            <Switch
              checked={assistantEnabled}
              onCheckedChange={(val) => onUpdate({ assistant_enabled: val })}
            />
          </div>

          {/* Tasks */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 tabular-nums">{tasks.length} taken</p>
            <TaskTemplateList
              tasks={tasks}
              onChange={(newTasks) => onUpdate({ task_templates: newTasks as unknown as Json })}
              onExplicitAction={onExplicitAction}
            />
          </div>

          {/* Delete button */}
          {onDelete && (
            <div className="pt-2 border-t border-border/50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={!canDelete}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1 rounded-button outline-none p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Fase verwijderen
                      </button>
                    </span>
                  </TooltipTrigger>
                  {!canDelete && (
                    <TooltipContent side="top">
                      <p>Er zijn nog actieve kandidaten in deze fase</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Fase verwijderen"
        description={`Weet je zeker dat je fase "${phase.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={() => {
          onDelete?.(phase.id);
          setShowDeleteConfirm(false);
        }}
      />
    </NestoCard>
  );
}
