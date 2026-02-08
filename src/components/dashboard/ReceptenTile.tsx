import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';

export function ReceptenTile() {
  const navigate = useNavigate();

  return (
    <NestoCard
      className="overflow-hidden cursor-pointer group transition-shadow duration-200 hover:shadow-md"
      onClick={() => navigate('/recepten')}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Recepten</span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
      <div className="mt-1">
        <span className="text-5xl font-bold text-muted-foreground tracking-tight">—</span>
      </div>
      <div
        className="mt-4 h-[100px] rounded-lg dark:opacity-[0.4]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)',
        }}
      />
      <p className="mt-2 text-xs text-muted-foreground text-center">Nog geen recepten</p>
    </NestoCard>
  );
}
