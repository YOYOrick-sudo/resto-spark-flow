import { NestoButton } from '@/components/polar/NestoButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Mail, Sparkles, HelpCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { NestoInput } from '@/components/polar/NestoInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface TaskTemplate {
  title: string;
  description?: string;
  assigned_role?: string | null;
  is_automated?: boolean;
  task_type?: string;
}

interface TaskTemplateListProps {
  tasks: TaskTemplate[];
  onChange: (tasks: TaskTemplate[]) => void;
  onExplicitAction?: () => void;
}

const AUTOMATABLE_TYPES = ['send_email', 'send_reminder'];

const ROLES = [
  { value: 'owner', label: 'Eigenaar' },
  { value: 'manager', label: 'Manager' },
  { value: 'service', label: 'Service' },
  { value: 'kitchen', label: 'Keuken' },
];

export function TaskTemplateList({ tasks, onChange, onExplicitAction }: TaskTemplateListProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const updateTask = (index: number, field: keyof TaskTemplate, value: any) => {
    const updated = tasks.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    onChange(updated);
  };

  const addTask = () => {
    onChange([...tasks, { title: '', assigned_role: 'manager', is_automated: false, task_type: 'manual' }]);
    onExplicitAction?.();
  };

  const removeTask = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
    setDeleteIndex(null);
    onExplicitAction?.();
  };

  const isAutomatable = (task: TaskTemplate) => {
    if (AUTOMATABLE_TYPES.includes(task.task_type || '')) return true;
    if (task.is_automated === true && !task.task_type) return true;
    // Fallback: herken email-taken op titel
    const emailKeywords = /bevestiging|email|sturen|herinnering|reminder|uitnodiging|welkom/i;
    return emailKeywords.test(task.title);
  };

  return (
    <div className="space-y-1.5">
      {tasks.map((task, index) => (
        <div
          key={index}
          className="group py-2.5 px-3 rounded-lg border border-border/30 transition-colors duration-150"
        >
          {/* Row 1: Title + delete */}
          <div className="flex items-center gap-2">
            <NestoInput
              value={task.title}
              onChange={(e) => updateTask(index, 'title', e.target.value)}
              placeholder="Taaknaam..."
              className="h-8 text-sm flex-1"
            />
            <button
              onClick={() => setDeleteIndex(index)}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors duration-150 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-primary/30 outline-none flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Row 2: Assignment / automation */}
          <div className="flex items-center gap-3 mt-1.5">
            {isAutomatable(task) ? (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Assistent</span>
                  <Switch
                    checked={task.is_automated !== false}
                    onCheckedChange={(checked) => {
                      updateTask(index, 'is_automated', checked);
                      onExplicitAction?.();
                    }}
                    className="ml-0.5"
                  />
                </div>
                {task.is_automated !== false ? (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs text-primary font-medium">Automatisch verstuurd</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px] text-xs">
                          De Assistent verstuurt deze email automatisch wanneer een kandidaat deze fase bereikt. Pas de inhoud aan via het tabblad E-mailtemplates.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Toegewezen aan:</span>
                    <Select
                      value={task.assigned_role || ''}
                      onValueChange={(val) => updateTask(index, 'assigned_role', val)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue placeholder="Selecteer rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Toegewezen aan:</span>
                <Select
                  value={task.assigned_role || ''}
                  onValueChange={(val) => updateTask(index, 'assigned_role', val)}
                >
                  <SelectTrigger className="h-7 w-[120px] text-xs">
                    <SelectValue placeholder="Selecteer rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      ))}

      <NestoButton variant="outline" size="sm" onClick={addTask} className="mt-1">
        <Plus className="h-4 w-4 mr-1" />
        Taak toevoegen
      </NestoButton>

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
