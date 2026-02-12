import { useState } from 'react';
import { useAllOnboardingPhases } from '@/hooks/useAllOnboardingPhases';
import { useUpdatePhaseConfig } from '@/hooks/useUpdatePhaseConfig';
import { useCreatePhase } from '@/hooks/useCreatePhase';
import { useDeletePhase } from '@/hooks/useDeletePhase';
import { useReorderPhases } from '@/hooks/useReorderPhases';
import { useResetOnboardingPhases } from '@/hooks/useResetOnboardingPhases';
import { PhaseConfigCard } from './PhaseConfigCard';
import { AddPhaseModal } from './AddPhaseModal';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { NestoButton } from '@/components/polar/NestoButton';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { nestoToast } from '@/lib/nestoToast';
import { Json } from '@/integrations/supabase/types';
import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

export function PhaseConfigSection() {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { data: phases, isLoading } = useAllOnboardingPhases();
  const updatePhase = useUpdatePhaseConfig();
  const createPhase = useCreatePhase();
  const deletePhase = useDeletePhase();
  const reorderPhases = useReorderPhases();
  const resetPhases = useResetOnboardingPhases();

  if (isLoading) return <><CardSkeleton lines={3} /><CardSkeleton lines={3} /><CardSkeleton lines={3} /></>;

  const handleUpdate = (phaseId: string, updates: { is_active?: boolean; name?: string; description?: string | null; task_templates?: Json }) => {
    updatePhase.mutate({ phaseId, updates });
  };

  const handleExplicitAction = () => {
    nestoToast.success('Taak bijgewerkt');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!phases) return;
    const ids = phases.map((p) => p.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    reorderPhases.mutate(ids);
  };

  return (
    <div className="space-y-4">
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

      <div className="flex justify-center pt-1">
        <NestoButton
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs gap-1.5"
          onClick={() => setShowResetConfirm(true)}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          Standaardinstelling herstellen
        </NestoButton>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Standaardinstelling herstellen"
        description="Dit vervangt alle huidige fasen en taken door de aanbevolen Nesto configuratie (10 fasen). Bestaande fasen worden gearchiveerd. Lopende kandidaten worden niet beïnvloed."
        confirmLabel="Herstellen"
        cancelLabel="Annuleren"
        variant="default"
        isLoading={resetPhases.isPending}
        onConfirm={() => {
          resetPhases.mutate(undefined, {
            onSuccess: () => setShowResetConfirm(false),
          });
        }}
      />
    </div>
  );
}
