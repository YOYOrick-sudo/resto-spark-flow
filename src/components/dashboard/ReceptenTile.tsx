import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';

export function ReceptenTile() {
  return (
    <NestoCard className="overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Recepten</span>
        <Link to="/recepten">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </Link>
      </div>
      <div className="mt-1">
        <span className="text-4xl font-bold text-muted-foreground tracking-tight">—</span>
      </div>
      <div
        className="mt-4 h-20 rounded-lg dark:opacity-[0.4]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)',
        }}
      />
    </NestoCard>
  );
}
