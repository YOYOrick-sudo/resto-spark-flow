import { useAllOnboardingPhases } from '@/hooks/useAllOnboardingPhases';
import { useUpdatePhaseConfig } from '@/hooks/useUpdatePhaseConfig';
import { useCreatePhase } from '@/hooks/useCreatePhase';
import { useDeletePhase } from '@/hooks/useDeletePhase';
import { useReorderPhases } from '@/hooks/useReorderPhases';
import { useOnboardingSettings, useUpdateOnboardingSettings } from '@/hooks/useOnboardingSettings';
import { PhaseConfigCard } from './PhaseConfigCard';
import { AddPhaseModal } from './AddPhaseModal';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoCard } from '@/components/polar/NestoCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { ArrowUp, ArrowDown, Sparkles, Mail, Bell } from 'lucide-react';

const ASSISTANT_ACTIONS = [
  { icon: Mail, text: 'Ontvangstbevestiging versturen bij nieuwe sollicitatie' },
  { icon: Mail, text: 'Aanvullende vragen email versturen' },
  { icon: Mail, text: 'Uitnodiging voor gesprek versturen' },
  { icon: Mail, text: 'Uitnodiging voor proefdienst versturen' },
  { icon: Mail, text: 'Aanbod & formulier versturen' },
  { icon: Mail, text: 'Welkomstmail versturen bij aanname' },
  { icon: Mail, text: 'Afwijzingsmail versturen' },
  { icon: Bell, text: 'Herinneringen versturen bij openstaande taken' },
];

export function PhaseConfigSection() {
  const { data: phases, isLoading } = useAllOnboardingPhases();
  const updatePhase = useUpdatePhaseConfig();
  const createPhase = useCreatePhase();
  const deletePhase = useDeletePhase();
  const reorderPhases = useReorderPhases();
  const { data: settings, isLoading: settingsLoading } = useOnboardingSettings();
  const updateSettings = useUpdateOnboardingSettings();

  const assistantEnabled = (settings as any)?.assistant_enabled ?? true;

  if (isLoading || settingsLoading) return <><CardSkeleton lines={3} /><CardSkeleton lines={3} /><CardSkeleton lines={3} /></>;

  const handleUpdate = (phaseId: string, updates: { is_active?: boolean; name?: string; description?: string | null; task_templates?: Json }) => {
    updatePhase.mutate({ phaseId, updates });
  };

  const handleExplicitAction = () => {
    toast.success('Taak bijgewerkt');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!phases) return;
    const ids = phases.map((p) => p.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    reorderPhases.mutate(ids);
  };

  const handleToggleAssistant = (enabled: boolean) => {
    updateSettings.mutate({ assistant_enabled: enabled } as any);
  };

  return (
    <div className="space-y-4">
      {/* Assistent card */}
      <NestoCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Assistent</h3>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="assistant-global" className="text-xs text-muted-foreground">
              {assistantEnabled ? 'Actief' : 'Uitgeschakeld'}
            </Label>
            <Switch
              id="assistant-global"
              checked={assistantEnabled}
              onCheckedChange={handleToggleAssistant}
            />
          </div>
        </div>
        <div className="space-y-1.5 mb-3">
          {ASSISTANT_ACTIONS.map((action, i) => (
            <div key={i} className="flex items-center gap-2">
              <action.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{action.text}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Je kunt de inhoud van deze emails aanpassen via het tabblad <span className="font-medium text-foreground">'E-mailtemplates'</span>.
        </p>
      </NestoCard>

      {/* Phase list */}
      {!phases?.length ? (
        <EmptyState title="Geen fasen" description="Er zijn nog geen onboarding fasen geconfigureerd." />
      ) : (
        <div className="space-y-3">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex gap-1.5 items-start">
              <div className="flex flex-col gap-0.5 pt-4">
                <NestoButton
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={() => handleMove(index, 'up')}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </NestoButton>
                <NestoButton
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === phases.length - 1}
                  onClick={() => handleMove(index, 'down')}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </NestoButton>
              </div>
              <div className="flex-1 min-w-0">
                <PhaseConfigCard
                  phase={phase}
                  index={index}
                  onUpdate={(updates) => handleUpdate(phase.id, updates)}
                  onDelete={(id) => deletePhase.mutate(id)}
                  onExplicitAction={handleExplicitAction}
                  canDelete={true}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <AddPhaseModal
          onAdd={(data) => createPhase.mutate(data)}
          isLoading={createPhase.isPending}
        />
      </div>
    </div>
  );
}
