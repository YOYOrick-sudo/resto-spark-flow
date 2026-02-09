import { PhaseColumn } from './PhaseColumn';

interface Phase {
  id: string;
  name: string;
  sort_order: number;
}

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  notes: string | null;
  phone: string | null;
  email: string;
  updated_at: string;
  status: string;
  current_phase_id: string | null;
}

interface PipelineBoardProps {
  phases: Phase[];
  candidates: Candidate[];
  onCandidateClick?: (id: string) => void;
  selectedCandidateId?: string | null;
}

export function PipelineBoard({ phases, candidates, onCandidateClick, selectedCandidateId }: PipelineBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
      {phases.map((phase) => (
        <PhaseColumn
          key={phase.id}
          phase={phase}
          candidates={candidates.filter((c) => c.current_phase_id === phase.id)}
          onCandidateClick={onCandidateClick}
          selectedCandidateId={selectedCandidateId}
        />
      ))}
    </div>
  );
}
