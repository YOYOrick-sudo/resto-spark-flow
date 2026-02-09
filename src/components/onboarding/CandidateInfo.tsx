import { formatDateTimeCompact } from '@/lib/datetime';

interface CandidateInfoProps {
  candidate: {
    email: string;
    phone: string | null;
    applied_at: string;
    notes: string | null;
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function CandidateInfo({ candidate }: CandidateInfoProps) {
  return (
    <div className="space-y-4">
      <div className="divide-y divide-border/30">
        <InfoRow label="E-mail" value={candidate.email} />
        {candidate.phone && <InfoRow label="Telefoon" value={candidate.phone} />}
        <InfoRow label="Aangemeld" value={formatDateTimeCompact(candidate.applied_at)} />
      </div>

      {candidate.notes && (
        <div className="pt-2">
          <h4 className="text-sm font-medium text-foreground mb-1">Notities</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p>
        </div>
      )}
    </div>
  );
}
