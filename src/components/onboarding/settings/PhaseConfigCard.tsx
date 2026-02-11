import { useState } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
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
  }) => void;
  onDelete?: (phaseId: string) => void;
  onExplicitAction?: () => void;
  canDelete?: boolean;
}

export function PhaseConfigCard({ phase, index, onUpdate, onDelete, onExplicitAction, canDelete = true }: PhaseConfigCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const tasks = (phase.task_templates as unknown as TaskTemplate[]) || [];

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
            {(phase as any).is_custom && (
              <NestoBadge variant="outline" size="sm">Aangepast</NestoBadge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1 flex-shrink-0">
          {/* Delete button in header — only for custom phases */}
          {expanded && onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    disabled={!canDelete}
                    className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 rounded focus-visible:ring-1 focus-visible:ring-primary/30 outline-none"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{canDelete ? "Fase verwijderen" : "Er zijn nog actieve kandidaten in deze fase"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
        <div className="mt-4 space-y-5">
          {/* Group 1: Fase-instellingen */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Fase naam</Label>
              <Input
                defaultValue={phase.name}
                onChange={(e) => debouncedNameUpdate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

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

          </div>

          {/* Divider between groups */}
          <div className="border-t border-border/40 pt-4 mt-4">
            {/* Group 2: Taken */}
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Taken</p>
              <NestoBadge variant="default" size="sm">{tasks.length}</NestoBadge>
            </div>
            <TaskTemplateList
              tasks={tasks}
              onChange={(newTasks) => onUpdate({ task_templates: newTasks as unknown as Json })}
              onExplicitAction={onExplicitAction}
            />
          </div>
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
