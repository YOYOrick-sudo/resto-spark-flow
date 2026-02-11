import { NestoButton } from '@/components/polar/NestoButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { NestoInput } from '@/components/polar/NestoInput';
import { useState } from 'react';

interface TaskTemplate {
  title: string;
  description?: string;
  assigned_role?: string | null;
  is_automated?: boolean;
}

interface TaskTemplateListProps {
  tasks: TaskTemplate[];
  onChange: (tasks: TaskTemplate[]) => void;
  onExplicitAction?: () => void;
}

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
    onChange([...tasks, { title: '', assigned_role: 'manager', is_automated: false }]);
    onExplicitAction?.();
  };

  const removeTask = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
    setDeleteIndex(null);
    onExplicitAction?.();
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => (
        <div
          key={index}
          className="group p-3 rounded-lg border border-border/40 hover:border-border/60 transition-colors duration-150"
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

          {/* Row 2: Role dropdown OR Assistent label + toggle */}
          <div className="flex items-center gap-4 mt-2">
            {task.is_automated ? (
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-sm text-primary font-medium">Assistent</span>
              </div>
            ) : (
              <Select
                value={task.assigned_role || ''}
                onValueChange={(val) => updateTask(index, 'assigned_role', val)}
              >
                <SelectTrigger className="h-8 w-[140px] text-sm">
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
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor={`auto-${index}`} className="text-xs text-muted-foreground cursor-pointer">
                Assistent
              </Label>
              <Switch
                id={`auto-${index}`}
                checked={task.is_automated ?? false}
                onCheckedChange={(val) => updateTask(index, 'is_automated', val)}
              />
            </div>
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
