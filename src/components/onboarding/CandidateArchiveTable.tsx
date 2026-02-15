import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { NestoBadge } from '@/components/polar/NestoBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_MAP: Record<string, { variant: 'success' | 'error' | 'warning' | 'pending'; label: string }> = {
  hired: { variant: 'success', label: 'Aangenomen' },
  rejected: { variant: 'error', label: 'Afgewezen' },
  withdrawn: { variant: 'warning', label: 'Teruggetrokken' },
  no_response: { variant: 'warning', label: 'Geen reactie' },
  expired: { variant: 'pending', label: 'Verlopen' },
  active: { variant: 'pending', label: 'Actief' },
};

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  updated_at: string;
  current_phase?: { id: string; name: string; sort_order: number } | null;
}

interface CandidateArchiveTableProps {
  candidates: Candidate[];
}

export function CandidateArchiveTable({ candidates }: CandidateArchiveTableProps) {
  const navigate = useNavigate();

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Geen kandidaten gevonden.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-caption text-muted-foreground uppercase tracking-wider px-4 pb-2">Naam</TableHead>
            <TableHead className="text-caption text-muted-foreground uppercase tracking-wider px-4 pb-2">E-mail</TableHead>
            <TableHead className="text-caption text-muted-foreground uppercase tracking-wider px-4 pb-2">Status</TableHead>
            <TableHead className="text-caption text-muted-foreground uppercase tracking-wider px-4 pb-2">Laatste fase</TableHead>
            <TableHead className="text-caption text-muted-foreground uppercase tracking-wider px-4 pb-2">Datum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/50">
          {candidates.map((c) => {
            const statusInfo = STATUS_MAP[c.status] ?? { variant: 'pending' as const, label: c.status };
            return (
              <TableRow
                key={c.id}
                onClick={() => navigate(`/onboarding/${c.id}`)}
                className="cursor-pointer hover:bg-accent/40 transition-colors duration-150 border-0"
              >
                <TableCell className="px-4 py-3 text-sm font-medium">
                  {c.first_name} {c.last_name}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {c.email}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <NestoBadge variant={statusInfo.variant} size="sm">{statusInfo.label}</NestoBadge>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {c.current_phase?.name ?? '—'}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: nl })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
