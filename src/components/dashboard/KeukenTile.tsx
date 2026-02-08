import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';

export function KeukenTile() {
  const done = 8;
  const total = 12;
  const remaining = total - done;
  const pct = Math.round((done / total) * 100);

  return (
    <NestoCard className="overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Keuken</span>
        <Link to="/keuken/taken">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </Link>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-foreground">{done}/{total}</span>
        <span className="text-sm text-muted-foreground">MEP-taken</span>
      </div>
      <div className="mt-4">
        <div className="h-3 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1d979e, #2BB4BC)' }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-xs text-muted-foreground">{remaining} resterend</span>
          <span className="text-xs font-medium text-primary">{pct}%</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border/50 flex items-start gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
        <span className="text-sm text-muted-foreground">3 ingrediënten onder minimum</span>
      </div>
    </NestoCard>
  );
}
