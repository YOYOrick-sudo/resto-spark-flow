import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { NestoTabContent } from '@/components/polar/NestoTabs';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { formatDateTimeCompact } from '@/lib/datetime';
import { DetailPageLayout } from '@/components/polar/DetailPageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/contexts/UserContext';
import { useOnboardingCandidates } from '@/hooks/useOnboardingCandidates';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { useOnboardingEvents } from '@/hooks/useOnboardingEvents';
import { useOnboardingPhases } from '@/hooks/useOnboardingPhases';
import { useOnboardingMessages } from '@/hooks/useOnboardingMessages';
import { useToggleTask } from '@/hooks/useToggleTask';
import { useAdvancePhase } from '@/hooks/useAdvancePhase';
import { useRejectCandidate } from '@/hooks/useRejectCandidate';
import { useSaveEvaluation } from '@/hooks/useSaveEvaluation';
import { useSendMessage } from '@/hooks/useSendMessage';
import { PhaseTaskList } from '@/components/onboarding/PhaseTaskList';
import { CandidateTimeline } from '@/components/onboarding/CandidateTimeline';
import { EvaluationForm } from '@/components/onboarding/EvaluationForm';
import { CandidateActions } from '@/components/onboarding/CandidateActions';
import { MessageThread } from '@/components/onboarding/MessageThread';
import { ComposeMessageModal } from '@/components/onboarding/ComposeMessageModal';
import { Mail } from 'lucide-react';

const STATUS_MAP: Record<string, { variant: 'default' | 'success' | 'error' | 'warning' | 'pending'; label: string }> = {
  active: { variant: 'default', label: 'Actief' },
  hired: { variant: 'success', label: 'Aangenomen' },
  rejected: { variant: 'error', label: 'Afgewezen' },
  withdrawn: { variant: 'warning', label: 'Teruggetrokken' },
  no_response: { variant: 'warning', label: 'Geen reactie' },
  expired: { variant: 'pending', label: 'Verlopen' },
};

const TABS = [
  { id: 'taken', label: 'Taken' },
  { id: 'berichten', label: 'Berichten' },
  { id: 'tijdlijn', label: 'Tijdlijn' },
];

const EVAL_PHASE_SORT_ORDERS = [40, 50];

export default function OnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const [activeTab, setActiveTab] = useState('taken');
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: phases } = useOnboardingPhases(locationId);
  const { data: candidates, isLoading: candidatesLoading } = useOnboardingCandidates(locationId);
  const { data: tasks, isLoading: tasksLoading } = useOnboardingTasks(id);
  const { data: events, isLoading: eventsLoading } = useOnboardingEvents(id);
  const { data: messages, isLoading: messagesLoading } = useOnboardingMessages(id);

  const toggleTask = useToggleTask();
  const advancePhase = useAdvancePhase();
  const rejectCandidate = useRejectCandidate();
  const saveEvaluation = useSaveEvaluation();
  const sendMessage = useSendMessage();

  const candidate = useMemo(
    () => candidates?.find((c) => c.id === id) ?? null,
    [candidates, id]
  );

  const currentPhaseId = candidate?.current_phase_id ?? null;

  const { allCurrentTasksDone, isLastPhase, showEvaluation, currentPhaseName, nextPhaseName } = useMemo(() => {
    if (!tasks || !candidate) return { allCurrentTasksDone: false, isLastPhase: false, showEvaluation: false, currentPhaseName: undefined, nextPhaseName: undefined };

    const currentTasks = tasks.filter((t) => t.phase_id === currentPhaseId);
    const allDone = currentTasks.length > 0 && currentTasks.every((t) => t.status === 'completed' || t.status === 'skipped');

    const currentPhase = candidate.current_phase as { id: string; name: string; sort_order: number } | null;
    const sortOrder = currentPhase?.sort_order ?? 0;
    const maxSortOrder = phases && phases.length > 0 ? Math.max(...phases.map(p => p.sort_order)) : 0;

    const nextPhase = phases?.find(p => p.sort_order > sortOrder && p.is_active);

    return {
      allCurrentTasksDone: allDone,
      isLastPhase: sortOrder > 0 && sortOrder === maxSortOrder,
      showEvaluation: EVAL_PHASE_SORT_ORDERS.includes(sortOrder),
      currentPhaseName: currentPhase?.name,
      nextPhaseName: nextPhase?.name,
    };
  }, [tasks, candidate, currentPhaseId, phases]);

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    if (!user?.id) return;
    toggleTask.mutate({ taskId, userId: user.id, currentStatus });
  };

  const handleReject = () => {
    if (!id || !user?.id || !locationId) return;
    rejectCandidate.mutate(
      { candidateId: id, userId: user.id, locationId },
      { onSuccess: () => navigate('/onboarding') }
    );
  };

  const handleSaveEvaluation = (evaluation: { rating: number; notes: string; recommendation: string }) => {
    if (!id || !user?.id || !locationId) return;
    saveEvaluation.mutate({ candidateId: id, evaluation, userId: user.id, locationId });
  };

  const handleAdvance = () => {
    if (!id || !user?.id) return;
    advancePhase.mutate(
      { candidateId: id, userId: user.id },
      { onSuccess: (data) => {
        if (data?.action === 'hired') navigate('/onboarding');
      }}
    );
  };

  if (candidatesLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Kandidaat niet gevonden.</p>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[candidate.status] ?? { variant: 'default' as const, label: candidate.status };
  const currentPhase = candidate.current_phase as { name: string } | null;

  return (
    <div className="p-6">
      <DetailPageLayout
        title={`${candidate.first_name} ${candidate.last_name}`}
        backLabel="Terug naar pipeline"
        backHref="/onboarding"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={
          <div className="flex items-center gap-2">
            <NestoBadge variant={statusInfo.variant} size="sm">{statusInfo.label}</NestoBadge>
            {currentPhase && (
              <span className="text-sm text-muted-foreground">Fase: {currentPhase.name}</span>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left column - tab content */}
          <div className="max-w-2xl">
            <NestoTabContent value="taken" activeValue={activeTab}>
              {tasksLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : tasks ? (
                <>
                  <PhaseTaskList
                    tasks={tasks}
                    currentPhaseId={currentPhaseId}
                    onToggleTask={handleToggleTask}
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

            <NestoTabContent value="berichten" activeValue={activeTab}>
              {candidate.status === 'active' && (
                <div className="flex justify-end mb-4">
                  <NestoButton size="sm" onClick={() => setComposeOpen(true)}>
                    <Mail className="h-4 w-4 mr-1.5" />
                    Verstuur bericht
                  </NestoButton>
                </div>
              )}
              {messagesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <MessageThread messages={messages ?? []} />
              )}
            </NestoTabContent>

            <NestoTabContent value="tijdlijn" activeValue={activeTab}>
              {eventsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : events ? (
                <CandidateTimeline events={events} />
              ) : null}
            </NestoTabContent>
          </div>

          {/* Right column - sidebar card */}
          <aside className="bg-card rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none dark:border dark:border-border p-5 space-y-4 h-fit">
            <h3 className="text-xs font-medium text-muted-foreground">Contactgegevens</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">E-mail</span>
                <p className="text-sm text-foreground">{candidate.email}</p>
              </div>
              {candidate.phone && (
                <div>
                  <span className="text-xs text-muted-foreground">Telefoon</span>
                  <p className="text-sm text-foreground">{candidate.phone}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">Aangemeld</span>
                <p className="text-sm text-foreground">{formatDateTimeCompact(candidate.applied_at)}</p>
              </div>
            </div>
            {candidate.notes && (
              <div className="pt-2 border-t border-border/30">
                <h3 className="text-xs font-medium text-muted-foreground mb-1">Notities</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p>
              </div>
            )}
          </aside>
        </div>

        <ComposeMessageModal
          open={composeOpen}
          onOpenChange={setComposeOpen}
          candidateName={`${candidate.first_name} ${candidate.last_name}`}
          onSend={({ subject, bodyHtml, bodyText }) => {
            sendMessage.mutate(
              { candidateId: id!, subject, bodyHtml, bodyText },
              { onSuccess: () => setComposeOpen(false) }
            );
          }}
          isSending={sendMessage.isPending}
        />
      </DetailPageLayout>

      {/* Sticky action bar - outside DetailPageLayout for correct sticky behavior */}
      <CandidateActions
        status={candidate.status}
        candidateName={`${candidate.first_name} ${candidate.last_name}`}
        allCurrentTasksDone={allCurrentTasksDone}
        isLastPhase={isLastPhase}
        currentPhaseName={currentPhaseName}
        nextPhaseName={nextPhaseName}
        onReject={handleReject}
        onAdvance={handleAdvance}
        isRejecting={rejectCandidate.isPending}
        isAdvancing={advancePhase.isPending}
      />
    </div>
  );
}
