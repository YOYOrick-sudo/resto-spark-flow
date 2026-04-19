import { Shield } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nestoToast } from '@/lib/nestoToast';
import { SettingsCardHeader } from '@/components/settings';

const TASK_GROUPS = [
  {
    label: '💬 Berichten',
    tasks: [
      { key: 'whatsapp_answer_faq', label: 'FAQ beantwoorden' },
      { key: 'whatsapp_create_reservation', label: 'Reserveringen boeken' },
      { key: 'whatsapp_modify_reservation', label: 'Reserveringen wijzigen' },
      { key: 'whatsapp_cancel_reservation', label: 'Reserveringen annuleren' },
      { key: 'send_reminder', label: 'Reminders versturen' },
      { key: 'send_confirmation', label: 'Bevestigingen versturen' },
    ],
  },
];

const AUTONOMY_OPTIONS = [
  { value: 'autonomous', label: 'Zelfstandig' },
  { value: 'recommend', label: 'Vraag eerst' },
  { value: 'disabled', label: 'Uit' },
];

interface TaskConfig {
  task_key: string;
  autonomy_level: string;
  is_enabled: boolean;
}

export function PermissionsTab() {
  const { currentLocation } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;

  const { data: configs, isLoading } = useQuery({
    queryKey: ['agent-configurations', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('agent_configurations')
        .select('task_key, autonomy_level, is_enabled')
        .eq('location_id', locationId);
      if (error) throw error;
      return (data || []) as TaskConfig[];
    },
    enabled: !!locationId,
  });

  const configMap = new Map<string, TaskConfig>();
  configs?.forEach(c => configMap.set(c.task_key, c));

  const updateTask = useMutation({
    mutationFn: async ({ task_key, autonomy_level, is_enabled }: { task_key: string; autonomy_level: string; is_enabled: boolean }) => {
      if (!locationId) throw new Error('No location');
      const { error } = await supabase
        .from('agent_configurations')
        .upsert({
          location_id: locationId,
          task_key,
          autonomy_level,
          is_enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'location_id,task_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configurations', locationId] });
      
    },
    onError: () => {
      nestoToast.error('Opslaan mislukt');
    },
  });

  const handleChange = (taskKey: string, value: string) => {
    if (value === 'disabled') {
      updateTask.mutate({ task_key: taskKey, autonomy_level: 'recommend', is_enabled: false });
    } else {
      updateTask.mutate({ task_key: taskKey, autonomy_level: value, is_enabled: true });
    }
  };

  const getSelectedValue = (taskKey: string): string => {
    const config = configMap.get(taskKey);
    if (!config || !config.is_enabled) return 'disabled';
    return config.autonomy_level;
  };

  if (isLoading) return <CardSkeleton lines={8} />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Bepaal per taak hoeveel autonomie de Assistent krijgt. Bij "Vraag eerst" zie je een kaart op het Overzicht.
      </p>

      {TASK_GROUPS.map((group) => (
        <NestoCard key={group.label} className="p-6">
          <SettingsCardHeader icon={<Shield />} title={group.label} />
          <div className="space-y-4">
            {group.tasks.map((task) => (
              <div key={task.key} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{task.label}</span>
                <Select
                  value={getSelectedValue(task.key)}
                  onValueChange={(v) => handleChange(task.key, v)}
                >
                  <SelectTrigger className="w-[160px] text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTONOMY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </NestoCard>
      ))}
    </div>
  );
}
