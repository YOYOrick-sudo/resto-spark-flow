import { useState, useMemo, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { DetailPanel } from '@/components/polar/DetailPanel';
import { PipelineBoard, StatusFilterPills, AddCandidateModal } from '@/components/onboarding';
import { CandidateDetailContent } from '@/components/onboarding/CandidateDetailContent';
import type { StatusFilter } from '@/components/onboarding';
import { useUserContext } from '@/contexts/UserContext';
import { useOnboardingPhases } from '@/hooks/useOnboardingPhases';
import { useOnboardingCandidates } from '@/hooks/useOnboardingCandidates';
import { Skeleton } from '@/components/ui/skeleton';

const REJECTED_STATUSES = ['rejected', 'withdrawn', 'no_response', 'expired'];

export default function OnboardingPage() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const { data: phases, isLoading: phasesLoading } = useOnboardingPhases(locationId);
  const { data: candidates, isLoading: candidatesLoading } = useOnboardingCandidates(locationId);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    switch (statusFilter) {
      case 'active':
        return candidates.filter((c) => c.status === 'active');
      case 'hired':
        return candidates.filter((c) => c.status === 'hired');
      case 'rejected':
        return candidates.filter((c) => REJECTED_STATUSES.includes(c.status));
      default:
        return candidates;
    }
  }, [candidates, statusFilter]);

  const selectedCandidate = useMemo(
    () => candidates?.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCandidateId) {
        setSelectedCandidateId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCandidateId]);

  // Scroll to selected candidate card
  useEffect(() => {
    if (!selectedCandidateId) return;
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-candidate-id="${selectedCandidateId}"]`);
      card?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    });
  }, [selectedCandidateId]);

  const isLoading = phasesLoading || candidatesLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-0 space-y-4">
        <PageHeader
          title="Onboarding"
          subtitle="Beheer je kandidaten pipeline"
          actions={[
            {
              label: 'Nieuwe kandidaat',
              icon: UserPlus,
              onClick: () => setShowAddModal(true),
              variant: 'primary',
            },
          ]}
        />
        <StatusFilterPills value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 pt-4">
        {/* Board */}
        <div className="flex-1 min-w-0 overflow-x-auto transition-all duration-200">
          {isLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="min-w-[280px] h-[300px] rounded-lg" />
              ))}
            </div>
          ) : phases && phases.length > 0 ? (
            <PipelineBoard
              phases={phases}
              candidates={filteredCandidates}
              onCandidateClick={(id) => setSelectedCandidateId(id)}
              selectedCandidateId={selectedCandidateId}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Geen onboarding fasen geconfigureerd.
            </p>
          )}
        </div>

        {/* Detail panel */}
      <DetailPanel
          open={!!selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
        >
          {selectedCandidateId && (
            <CandidateDetailContent
              candidateId={selectedCandidateId}
              onClose={() => setSelectedCandidateId(null)}
            />
          )}
        </DetailPanel>
      </div>

      {locationId && (
        <AddCandidateModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          locationId={locationId}
        />
      )}
    </div>
  );
}
