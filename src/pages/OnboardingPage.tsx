import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { PipelineBoard, StatusFilterPills, AddCandidateModal, CandidateArchiveTable } from '@/components/onboarding';
import type { StatusFilter } from '@/components/onboarding';
import { useUserContext } from '@/contexts/UserContext';
import { useOnboardingPhases } from '@/hooks/useOnboardingPhases';
import { useOnboardingCandidates } from '@/hooks/useOnboardingCandidates';
import { Skeleton } from '@/components/ui/skeleton';

const REJECTED_STATUSES = ['rejected', 'withdrawn', 'no_response', 'expired'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const { data: phases, isLoading: phasesLoading } = useOnboardingPhases(locationId);
  const { data: candidates, isLoading: candidatesLoading } = useOnboardingCandidates(locationId);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showAddModal, setShowAddModal] = useState(false);

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

      <div className="flex-1 min-h-0 px-6 pb-6 pt-4 overflow-x-auto">
        {isLoading ? (
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[280px] h-[300px] rounded-lg" />
            ))}
          </div>
        ) : statusFilter === 'active' ? (
          phases && phases.length > 0 ? (
            <PipelineBoard
              phases={phases}
              candidates={filteredCandidates}
              onCandidateClick={(id) => navigate(`/onboarding/${id}`)}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Geen onboarding fasen geconfigureerd.
            </p>
          )
        ) : (
          <CandidateArchiveTable candidates={filteredCandidates} />
        )}
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
