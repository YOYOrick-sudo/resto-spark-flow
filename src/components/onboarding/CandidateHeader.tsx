import { NestoBadge } from '@/components/polar/NestoBadge';

const STATUS_MAP: Record<string, { variant: 'default' | 'success' | 'error' | 'warning' | 'pending'; label: string }> = {
  active: { variant: 'default', label: 'Actief' },
  hired: { variant: 'success', label: 'Aangenomen' },
  rejected: { variant: 'error', label: 'Afgewezen' },
  withdrawn: { variant: 'warning', label: 'Teruggetrokken' },
  no_response: { variant: 'warning', label: 'Geen reactie' },
  expired: { variant: 'pending', label: 'Verlopen' },
};

interface CandidateHeaderProps {
  candidate: {
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    current_phase?: { name: string } | null;
  };
}

export function CandidateHeader({ candidate }: CandidateHeaderProps) {
  const statusInfo = STATUS_MAP[candidate.status] ?? { variant: 'default' as const, label: candidate.status };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">
        {candidate.first_name} {candidate.last_name}
      </h2>
      <p className="text-sm text-muted-foreground">{candidate.email}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <NestoBadge variant={statusInfo.variant} size="sm">{statusInfo.label}</NestoBadge>
        {candidate.current_phase && (
          <span className="text-xs text-muted-foreground">
            Fase: {candidate.current_phase.name}
          </span>
        )}
      </div>
    </div>
  );
}
