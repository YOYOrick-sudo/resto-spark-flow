import { NestoButton } from '@/components/polar/NestoButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { AssistentIcon } from '@/components/icons/AssistentIcon';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { useLocationTeamMembers } from '@/hooks/useLocationTeamMembers';
import { NestoBadge } from '@/components/polar/NestoBadge';

interface TaskTemplate {
  title: string;
  description?: string;
  assigned_to?: string | null;
  is_automated?: boolean;
  task_type?: string;
  is_system?: boolean;
}

interface TaskTemplateListProps {
  tasks: TaskTemplate[];
  onChange: (tasks: TaskTemplate[]) => void;
  onExplicitAction?: () => void;
}

const AUTOMATABLE_TYPES = ['send_email', 'send_reminder'];

export function TaskTemplateList({ tasks, onChange, onExplicitAction }: TaskTemplateListProps) {
  const { data: teamMembers = [] } = useLocationTeamMembers();
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const updateTask = (index: number, field: keyof TaskTemplate, value: any) => {
    const updated = tasks.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    onChange(updated);
  };

  const addTask = () => {
    onChange([...tasks, { title: '', assigned_to: null, is_automated: false, task_type: 'manual', is_system: false }]);
    onExplicitAction?.();
  };

  const removeTask = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
    setDeleteIndex(null);
    onExplicitAction?.();
  };

  const isSystemTask = (task: TaskTemplate) => {
    return task.is_system === true || ['send_email', 'send_reminder'].includes(task.task_type || '');
  };

  const isAutomatable = (task: TaskTemplate) => {
    if (isSystemTask(task)) return true;
    if (AUTOMATABLE_TYPES.includes(task.task_type || '')) return true;
    if (task.is_automated === true && !task.task_type) return true;
    const emailKeywords = /bevestiging|email|sturen|herinnering|reminder|uitnodiging|welkom/i;
    return emailKeywords.test(task.title);
  };

  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-[1fr_240px_32px] gap-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 pb-2 border-b border-border/50 mb-0">
        <span>Taak</span>
        <span className="text-right">Uitvoering</span>
        <span />
      </div>

      {/* Data rows */}
      <div className="divide-y divide-border/50">
      {tasks.map((task, index) => {
          const isSystem = isSystemTask(task);
          return (
          <div
            key={index}
            className="grid grid-cols-[1fr_240px_32px] items-center gap-3 py-2 px-2.5 hover:bg-accent/40 transition-colors duration-150 group"
          >
            {/* Col 1: Task name — ghost input for custom, plain text for system */}
            {isSystem ? (
              <div className="h-8 flex items-center px-2">
                <span className="text-sm font-semibold text-foreground">{task.title}</span>
              </div>
            ) : (
              <input
                value={task.title}
                onChange={(e) => updateTask(index, 'title', e.target.value)}
                placeholder="Taaknaam..."
                className="h-8 text-sm font-semibold text-foreground bg-card border-[1.5px] border-border rounded-button px-2 focus:!border-primary focus:outline-none focus:ring-0 transition-colors placeholder:text-muted-foreground"
              />
            )}

            {/* Col 2: Execution — fixed width for alignment */}
            <div className="flex items-center gap-2.5 w-[240px] justify-end">
              {isAutomatable(task) ? (
                <>
                  <AssistentIcon size={14} className="flex-shrink-0" />
                  <Switch
                    checked={task.is_automated !== false}
                    onCheckedChange={(checked) => {
                      updateTask(index, 'is_automated', checked);
                      onExplicitAction?.();
                    }}
                  />
                  {task.is_automated !== false ? (
                    <div className="flex items-center gap-1.5">
                      <AssistentIcon size={14} className="flex-shrink-0" />
                      <span className="text-xs text-primary font-medium whitespace-nowrap">Automatisch</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px] text-xs">
                            De Assistent verstuurt deze email automatisch wanneer een kandidaat deze fase bereikt.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <TeamMemberSelect
                      members={teamMembers}
                      value={task.assigned_to || ''}
                      onChange={(val) => updateTask(index, 'assigned_to', val)}
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-end w-full">
                  <TeamMemberSelect
                    members={teamMembers}
                    value={task.assigned_to || ''}
                    onChange={(val) => updateTask(index, 'assigned_to', val)}
                  />
                </div>
              )}
            </div>

            {/* Col 3: Delete — hidden for system tasks */}
            {isSystem ? (
              <div className="w-[32px]" />
            ) : (
              <button
                onClick={() => setDeleteIndex(index)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors duration-150 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-primary/30 outline-none"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          );
        })}
      </div>

      <div className="mt-2 px-2.5">
        <NestoButton variant="outline" size="sm" onClick={addTask}>
          <Plus className="h-4 w-4 mr-1" />
          Taak toevoegen
        </NestoButton>
      </div>

      <ConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
        title="Taak verwijderen"
        description="Weet je zeker dat je deze taak wilt verwijderen uit de template?"
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={() => deleteIndex !== null && removeTask(deleteIndex)}
      />
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Eigenaar',
  manager: 'Manager',
  service: 'Service',
  kitchen: 'Keuken',
};

function TeamMemberSelect({ members, value, onChange }: { members: { user_id: string; name: string | null; email: string; role: string }[]; value: string; onChange: (val: string) => void }) {
  // Only match UUIDs, not old role strings
  const isValidSelection = value && members.some(m => m.user_id === value);

  return (
    <Select value={isValidSelection ? value : undefined} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-[160px] text-xs border-[1.5px] border-border bg-card focus:!border-primary focus:ring-0">
        <SelectValue placeholder="Selecteer persoon" />
      </SelectTrigger>
      <SelectContent className="bg-card border border-border z-50">
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id} className="text-xs">
            <div className="flex items-center gap-1.5">
              <span className="truncate">{member.name || member.email}</span>
              <NestoBadge variant="outline" size="sm" className="ml-auto">
                {ROLE_LABELS[member.role] || member.role}
              </NestoBadge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
