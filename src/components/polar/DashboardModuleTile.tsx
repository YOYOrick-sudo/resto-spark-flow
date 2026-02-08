import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { NestoCard } from './NestoCard';
import { cn } from '@/lib/utils';

interface SecondaryMetric {
  label: string;
  value: string;
}

export interface DashboardModuleTileProps {
  title: string;
  heroValue: string;
  heroLabel: string;
  secondaryMetrics?: SecondaryMetric[];
  linkTo: string;
  linkLabel?: string;
}

export function DashboardModuleTile({
  title,
  heroValue,
  heroLabel,
  secondaryMetrics,
  linkTo,
  linkLabel = 'Bekijken',
}: DashboardModuleTileProps) {
  const isEmpty = heroValue === '—';

  return (
    <NestoCard className="flex flex-col justify-between h-full">
      <div>
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="mt-2">
          <span className={cn('text-3xl font-semibold', isEmpty ? 'text-muted-foreground' : 'text-foreground')}>
            {heroValue}
          </span>
          <p className="text-sm text-muted-foreground mt-0.5">{heroLabel}</p>
        </div>
        {secondaryMetrics && secondaryMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 pt-4 border-t border-border/50">
            {secondaryMetrics.map((m) => (
              <div key={m.label}>
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <p className="text-sm font-medium text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Link
        to={linkTo}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
      >
        {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </NestoCard>
  );
}
