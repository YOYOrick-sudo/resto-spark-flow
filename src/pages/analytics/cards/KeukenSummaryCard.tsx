import { ChefHat } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';

interface Props {
  periodDays: number;
}

export function KeukenSummaryCard({}: Props) {
  return (
    <NestoCard className="opacity-60">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-accent rounded-lg">
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Keuken & Productie</span>
        </div>
        <NestoBadge variant="default" size="sm">Binnenkort</NestoBadge>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-muted-foreground">—%</span>
        <span className="text-sm text-muted-foreground">food cost</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        <span>MEP —</span>
        <span>·</span>
        <span>Productie —</span>
      </div>
    </NestoCard>
  );
}
