import { useAllOnboardingPhases } from '@/hooks/useAllOnboardingPhases';
import { useUpdatePhaseConfig } from '@/hooks/useUpdatePhaseConfig';
import { PhaseConfigCard } from './PhaseConfigCard';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export function PhaseConfigSection() {
  const { data: phases, isLoading } = useAllOnboardingPhases();
  const updatePhase = useUpdatePhaseConfig();

  if (isLoading) return <><CardSkeleton lines={3} /><CardSkeleton lines={3} /><CardSkeleton lines={3} /></>;
  if (!phases?.length) return <EmptyState title="Geen fasen" description="Er zijn nog geen onboarding fasen geconfigureerd." />;

  const handleUpdate = (phaseId: string, updates: { is_active?: boolean; description?: string | null; task_templates?: Json }) => {
    updatePhase.mutate({ phaseId, updates });
  };

  const handleExplicitAction = () => {
    toast.success('Taak bijgewerkt');
  };

  return (
    <div className="space-y-3">
      {phases.map((phase, index) => (
        <PhaseConfigCard
          key={phase.id}
          phase={phase}
          index={index}
          onUpdate={(updates) => handleUpdate(phase.id, updates)}
          onExplicitAction={handleExplicitAction}
        />
      ))}
    </div>
  );
}
