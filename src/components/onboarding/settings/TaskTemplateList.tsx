import { Input } from '@/components/ui/input';
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
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
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
  onExplicitAction?: () => void; // trigger toast for add/remove
}

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'service', label: 'Service' },
  { value: 'kitchen', label: 'Kitchen' },
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
    <div className="divide-y divide-border/50">
      {tasks.map((task, index) => (
        <div key={index} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/40 transition-colors duration-150">
          <div className="flex-1 space-y-2">
            <Input
              value={task.title}
              onChange={(e) => updateTask(index, 'title', e.target.value)}
              placeholder="Taaknaam..."
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-4">
              <Select
                value={task.assigned_role || ''}
                onValueChange={(val) => updateTask(index, 'assigned_role', val)}
              >
                <SelectTrigger className="h-8 w-[140px] text-sm">
                  <SelectValue placeholder="Rol..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  id={`auto-${index}`}
                  checked={task.is_automated ?? false}
                  onCheckedChange={(val) => updateTask(index, 'is_automated', val)}
                />
                <Label htmlFor={`auto-${index}`} className="text-xs text-muted-foreground">
                  Geautomatiseerd
                </Label>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDeleteIndex(index)}
            className="mt-1 p-1.5 text-muted-foreground hover:text-destructive transition-colors duration-150 rounded focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-1 outline-none"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <NestoButton variant="outline" size="sm" onClick={addTask}>
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
