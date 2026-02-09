import { cn } from '@/lib/utils';

export type StatusFilter = 'active' | 'hired' | 'rejected' | 'all';

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Actief' },
  { value: 'hired', label: 'Afgerond' },
  { value: 'rejected', label: 'Afgewezen' },
  { value: 'all', label: 'Alle' },
];

interface StatusFilterPillsProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}

export function StatusFilterPills({ value, onChange }: StatusFilterPillsProps) {
  return (
    <div className="flex gap-1.5">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            value === filter.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
