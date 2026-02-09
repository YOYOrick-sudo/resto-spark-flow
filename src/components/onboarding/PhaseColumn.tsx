import { NestoBadge } from '@/components/polar/NestoBadge';
import { CandidateCard } from './CandidateCard';

interface PhaseColumnProps {
  phase: { id: string; name: string };
  candidates: Array<{
    id: string;
    first_name: string;
    last_name: string;
    notes: string | null;
    phone: string | null;
    email: string;
    updated_at: string;
    status: string;
  }>;
  onCandidateClick?: (id: string) => void;
}

export function PhaseColumn({ phase, candidates, onCandidateClick }: PhaseColumnProps) {
  return (
    <div className="min-w-[280px] w-[300px] flex-shrink-0 bg-secondary/30 rounded-lg p-3 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium truncate">{phase.name}</span>
        <NestoBadge variant="default" size="sm">
          {candidates.length}
        </NestoBadge>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 flex-1">
        {candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Geen kandidaten
          </p>
        ) : (
          candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onClick={() => onCandidateClick?.(candidate.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
