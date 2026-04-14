import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';

const mockCategories = [
  { label: 'Hoofdgerecht', count: 12, pct: 50 },
  { label: 'Voorgerecht', count: 7, pct: 29 },
  { label: 'Dessert', count: 5, pct: 21 },
];

export function ReceptenTile() {
  const navigate = useNavigate();
  const total = 24;

  return (
    <NestoCard
      className="overflow-hidden cursor-pointer group transition-shadow duration-200 hover:shadow-md"
      onClick={() => navigate('/recepten')}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Halffabricaten</span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-foreground">{total}</span>
        <span className="text-sm text-muted-foreground">halffabricaten</span>
      </div>
      <div className="mt-4 space-y-2.5">
        {mockCategories.map((cat) => (
          <div key={cat.label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-muted-foreground">{cat.label}</span>
              <span className="text-xs font-medium text-foreground">{cat.count}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${cat.pct}%`,
                  background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-border/50 flex items-start gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
        <span className="text-sm text-muted-foreground">3 nieuw deze week</span>
      </div>
    </NestoCard>
  );
}
