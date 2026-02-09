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
}

export function PipelineBoard({ phases, candidates, onCandidateClick }: PipelineBoardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {phases.map((phase, index) => (
        <PhaseColumn
          key={phase.id}
          phase={phase}
          phaseNumber={index + 1}
          candidates={candidates.filter((c) => c.current_phase_id === phase.id)}
          onCandidateClick={onCandidateClick}
        />
      ))}
    </div>
  );
}
