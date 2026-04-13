import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { NestoCard } from '@/components/polar/NestoCard';
import { useWasteRegistraties } from '@/hooks/useWasteRegistraties';

const renderTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { datum, kosten } = payload[0].payload;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg">
      <span className="font-medium">{datum}</span>
      <span className="ml-2">€{kosten.toFixed(2)}</span>
    </div>
  );
};

export function WasteTile() {
  const navigate = useNavigate();
  const { data: registraties } = useWasteRegistraties();

  const totaalKosten = useMemo(
    () => (registraties ?? []).reduce((s, r) => s + (r.geschatte_kosten ?? 0), 0),
    [registraties]
  );

  const chartData = useMemo(() => {
    if (!registraties?.length) return [];
    const perDag = new Map<string, number>();
    registraties.forEach((r) => {
      const dag = r.waste_datum;
      perDag.set(dag, (perDag.get(dag) ?? 0) + (r.geschatte_kosten ?? 0));
    });
    return Array.from(perDag.entries())
      .map(([datum, kosten]) => ({ datum, kosten }))
      .sort((a, b) => a.datum.localeCompare(b.datum));
  }, [registraties]);

  const topCategorie = useMemo(() => {
    if (!registraties?.length) return null;
    const perCat = new Map<string, number>();
    registraties.forEach((r) => {
      perCat.set(r.categorie, (perCat.get(r.categorie) ?? 0) + (r.geschatte_kosten ?? 0));
    });
    if (totaalKosten === 0) return null;
    let top = { cat: '', kosten: 0 };
    perCat.forEach((k, c) => { if (k > top.kosten) top = { cat: c, kosten: k }; });
    const pct = Math.round((top.kosten / totaalKosten) * 100);
    return { naam: top.cat, percentage: pct };
  }, [registraties, totaalKosten]);

  const heroValue = totaalKosten > 0 ? `€${totaalKosten.toFixed(2)}` : '—';

  return (
    <NestoCard
      className="overflow-hidden !p-0 cursor-pointer group transition-shadow duration-200 hover:shadow-md"
      onClick={() => navigate('/analytics?tab=waste')}
    >
      <div className="px-6 pt-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Waste</span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
      <div className="px-6 mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-foreground">{heroValue}</span>
        <span className="text-sm text-muted-foreground">deze week</span>
      </div>
      <div className="mt-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="wasteBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--error))" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="hsl(var(--error))" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <Tooltip content={renderTooltip} cursor={false} />
              <Bar dataKey="kosten" fill="url(#wasteBarGradient)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[120px]" />
        )}
      </div>
      {topCategorie && (
        <div className="border-t border-border/50 px-6 py-3">
          <span className="text-xs text-muted-foreground">
            <span className="capitalize font-medium text-error">{topCategorie.naam}</span>
            {' '}is {topCategorie.percentage}% van waste
          </span>
        </div>
      )}
    </NestoCard>
  );
}
