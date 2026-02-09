import { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { NestoTabs, NestoTabContent } from '@/components/polar/NestoTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOnboardingCandidates } from '@/hooks/useOnboardingCandidates';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { useOnboardingEvents } from '@/hooks/useOnboardingEvents';
import { useOnboardingPhases } from '@/hooks/useOnboardingPhases';
import { useCompleteTask } from '@/hooks/useCompleteTask';
import { useRejectCandidate } from '@/hooks/useRejectCandidate';
import { useSaveEvaluation } from '@/hooks/useSaveEvaluation';
import { CandidateHeader } from './CandidateHeader';
import { PhaseTaskList } from './PhaseTaskList';
import { CandidateInfo } from './CandidateInfo';
import { CandidateTimeline } from './CandidateTimeline';
import { EvaluationForm } from './EvaluationForm';
import { CandidateActions } from './CandidateActions';

interface CandidateDetailSheetProps {
  candidateId: string | null;
  onClose: () => void;
}

const TABS = [
  { id: 'taken', label: 'Taken' },
  { id: 'info', label: 'Info' },
  { id: 'tijdlijn', label: 'Tijdlijn' },
];

const EVAL_PHASE_SORT_ORDERS = [40, 50];

export function CandidateDetailSheet({ candidateId, onClose }: CandidateDetailSheetProps) {
  const { user } = useAuth();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const [activeTab, setActiveTab] = useState('taken');

  const { data: phases } = useOnboardingPhases(locationId);
  const { data: candidates } = useOnboardingCandidates(locationId);
  const { data: tasks, isLoading: tasksLoading } = useOnboardingTasks(candidateId ?? undefined);
  const { data: events, isLoading: eventsLoading } = useOnboardingEvents(candidateId ?? undefined);

  const completeTask = useCompleteTask();
  const rejectCandidate = useRejectCandidate();
  const saveEvaluation = useSaveEvaluation();

  const candidate = useMemo(
    () => candidates?.find((c) => c.id === candidateId) ?? null,
    [candidates, candidateId]
  );

  const currentPhaseId = candidate?.current_phase_id ?? null;

  const { allCurrentTasksDone, isLastPhase, showEvaluation } = useMemo(() => {
    if (!tasks || !candidate) return { allCurrentTasksDone: false, isLastPhase: false, showEvaluation: false };

    const currentTasks = tasks.filter((t) => t.phase_id === currentPhaseId);
    const allDone = currentTasks.length > 0 && currentTasks.every((t) => t.status === 'completed' || t.status === 'skipped');

    const currentPhase = candidate.current_phase as { id: string; name: string; sort_order: number } | null;
    const sortOrder = currentPhase?.sort_order ?? 0;

    const maxSortOrder = phases && phases.length > 0 ? Math.max(...phases.map(p => p.sort_order)) : 0;

    return {
      allCurrentTasksDone: allDone,
      isLastPhase: sortOrder > 0 && sortOrder === maxSortOrder,
      showEvaluation: EVAL_PHASE_SORT_ORDERS.includes(sortOrder),
    };
  }, [tasks, candidate, currentPhaseId, phases]);

  const handleCompleteTask = (taskId: string) => {
    if (!user?.id) return;
    completeTask.mutate({ taskId, userId: user.id });
  };

  const handleReject = () => {
    if (!candidateId || !user?.id || !locationId) return;
    rejectCandidate.mutate(
      { candidateId, userId: user.id, locationId },
      { onSuccess: () => onClose() }
    );
  };

  const handleSaveEvaluation = (evaluation: { rating: number; notes: string; recommendation: string }) => {
    if (!candidateId || !user?.id || !locationId) return;
    saveEvaluation.mutate({ candidateId, evaluation, userId: user.id, locationId });
  };

  const queryClient = useQueryClient();

  const handleAdvance = () => {
    queryClient.invalidateQueries({ queryKey: ['onboarding-candidates'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-events'] });
    toast.success('Doorgegaan naar volgende fase');
  };

  return (
    <Sheet open={!!candidateId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="max-w-[520px] w-full p-0 flex flex-col">
        {candidate ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border/50">
              <CandidateHeader candidate={candidate} />
            </div>

            {/* Tabs */}
            <div className="px-4 pt-2">
              <NestoTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Tab content - scrollable */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <NestoTabContent value="taken" activeValue={activeTab}>
                {tasksLoading ? (
                  <div className="space-y-3 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : tasks ? (
                  <>
                    <PhaseTaskList
                      tasks={tasks}
                      currentPhaseId={currentPhaseId}
                      onCompleteTask={handleCompleteTask}
                      disabled={candidate.status !== 'active'}
                    />
                    {showEvaluation && candidate.status === 'active' && (
                      <EvaluationForm
                        onSave={handleSaveEvaluation}
                        isLoading={saveEvaluation.isPending}
                      />
                    )}
                  </>
                ) : null}
              </NestoTabContent>

              <NestoTabContent value="info" activeValue={activeTab}>
                <CandidateInfo candidate={candidate} />
              </NestoTabContent>

              <NestoTabContent value="tijdlijn" activeValue={activeTab}>
                {eventsLoading ? (
                  <div className="space-y-3 pt-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : events ? (
                  <CandidateTimeline events={events} />
                ) : null}
              </NestoTabContent>
            </div>

            {/* Sticky footer */}
            <CandidateActions
              status={candidate.status}
              candidateName={`${candidate.first_name} ${candidate.last_name}`}
              allCurrentTasksDone={allCurrentTasksDone}
              isLastPhase={isLastPhase}
              onReject={handleReject}
              onAdvance={handleAdvance}
              isRejecting={rejectCandidate.isPending}
            />
          </>
        ) : (
          <div className="p-6">
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
