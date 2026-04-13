import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';

interface Props {
  periodDays: number;
  onClick: () => void;
}

export function ReserveringenSummaryCard({ onClick }: Props) {
  return (
    <NestoCard hoverable className="cursor-pointer group" onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Reserveringen</span>
        </div>
        <div className="flex items-center gap-2">
          <NestoBadge variant="default" size="sm">Binnenkort</NestoBadge>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">—</span>
        <span className="text-sm text-muted-foreground">gasten deze week</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        <span>No-show —%</span>
        <span>·</span>
        <span>Gem. omzet —</span>
      </div>
    </NestoCard>
  );
}
