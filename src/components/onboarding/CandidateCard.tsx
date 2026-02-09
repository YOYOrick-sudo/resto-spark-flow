import { PhaseDurationBadge } from './PhaseDurationBadge';

interface CandidateCardProps {
  candidate: {
    id: string;
    first_name: string;
    last_name: string;
    notes: string | null;
    phone: string | null;
    email: string;
    updated_at: string;
    status: string;
  };
  onClick?: () => void;
}

export function CandidateCard({ candidate, onClick }: CandidateCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border/50 hover:border-primary/30 rounded-lg p-3 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {candidate.first_name} {candidate.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {candidate.email}
          </p>
        </div>
        <PhaseDurationBadge updatedAt={candidate.updated_at} />
      </div>
    </div>
  );
}
