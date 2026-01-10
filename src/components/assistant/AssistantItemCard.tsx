import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Lightbulb } from 'lucide-react';
import { AssistantItem, AssistantSeverity } from '@/types/assistant';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { formatDateTimeCompact } from '@/lib/datetime';
import { cn } from '@/lib/utils';

interface AssistantItemCardProps {
  item: AssistantItem;
}

const severityConfig: Record<AssistantSeverity, { icon: typeof AlertCircle; className: string }> = {
  error: { icon: AlertCircle, className: 'text-destructive' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  info: { icon: Info, className: 'text-muted-foreground' },
  ok: { icon: CheckCircle, className: 'text-success' },
};

const moduleLabels: Record<string, string> = {
  reserveringen: 'Reserveringen',
  keuken: 'Keuken',
  revenue: 'Revenue',
  configuratie: 'Configuratie',
};

export function AssistantItemCard({ item }: AssistantItemCardProps) {
  const navigate = useNavigate();
  const { icon: SeverityIcon, className: iconClassName } = severityConfig[item.severity];
  const isClickable = Boolean(item.action_path);

  const handleClick = () => {
    if (item.action_path) {
      navigate(item.action_path);
    }
  };

  return (
    <NestoCard
      className={cn(
        'p-3',
        isClickable && 'cursor-pointer hover:bg-accent/50 transition-colors'
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Severity Icon */}
        <SeverityIcon className={cn('h-5 w-5 mt-0.5 shrink-0', iconClassName)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {item.title}
            </span>
            {item.kind === 'insight' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <Lightbulb className="h-3 w-3" />
                Insight
              </span>
            )}
          </div>
          {item.message && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {item.message}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 shrink-0">
          <NestoBadge variant="default" className="text-xs">
            {moduleLabels[item.module]}
          </NestoBadge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTimeCompact(item.created_at)}
          </span>
        </div>
      </div>
    </NestoCard>
  );
}
