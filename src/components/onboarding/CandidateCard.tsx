import { PhaseDurationBadge } from './PhaseDurationBadge';
import { cn } from '@/lib/utils';

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
  isSelected?: boolean;
}

export function CandidateCard({ candidate, onClick, isSelected }: CandidateCardProps) {
  return (
    <div
      data-candidate-id={candidate.id}
      onClick={onClick}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-pointer transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border/50 hover:border-primary/30'
      )}
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
