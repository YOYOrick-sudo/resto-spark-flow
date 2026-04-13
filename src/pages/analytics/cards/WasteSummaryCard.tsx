import { useMemo } from 'react';
import { ArrowUpRight, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { useWasteRegistraties } from '@/hooks/useWasteRegistraties';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

interface Props {
  periodDays: number;
  onClick: () => void;
}

export function WasteSummaryCard({ onClick }: Props) {
  const { data: current } = useWasteRegistraties();

  const prevFrom = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const prevTo = format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: previous } = useWasteRegistraties({ from: prevFrom, to: prevTo });

  const totaal = useMemo(
    () => (current ?? []).reduce((s, r) => s + ((r as any).geschatte_kosten ?? 0), 0),
    [current]
  );

  const prevTotaal = useMemo(
    () => (previous ?? []).reduce((s, r) => s + ((r as any).geschatte_kosten ?? 0), 0),
    [previous]
  );

  const trendPct = prevTotaal > 0 ? Math.round(((totaal - prevTotaal) / prevTotaal) * 100) : null;

  const topCategorie = useMemo(() => {
    if (!current?.length || totaal === 0) return null;
    const perCat = new Map<string, number>();
    current.forEach((r) => {
      const cat = (r as any).categorie ?? 'onbekend';
      perCat.set(cat, (perCat.get(cat) ?? 0) + ((r as any).geschatte_kosten ?? 0));
    });
    let top = { cat: '', kosten: 0 };
    perCat.forEach((k, c) => { if (k > top.kosten) top = { cat: c, kosten: k }; });
    return top.cat;
  }, [current, totaal]);

  return (
    <NestoCard
      hoverable
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-destructive/10 rounded-lg">
            <Trash2 className="h-4 w-4 text-destructive" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Waste</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">
          {totaal > 0 ? `€${totaal.toFixed(0)}` : '—'}
        </span>
        <span className="text-sm text-muted-foreground">deze week</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        {trendPct !== null && (
          <span className={`flex items-center gap-1 font-medium ${trendPct <= 0 ? 'text-success' : 'text-destructive'}`}>
            {trendPct <= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {Math.abs(trendPct)}%
          </span>
        )}
        {topCategorie && (
          <span>Top: <span className="capitalize font-medium text-foreground">{topCategorie}</span></span>
        )}
      </div>
    </NestoCard>
  );
}
