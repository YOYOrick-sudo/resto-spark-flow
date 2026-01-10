import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Lightbulb, ChevronRight } from 'lucide-react';
import { AssistantItem, AssistantSeverity, AssistantModule } from '@/types/assistant';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { formatDateTimeCompact } from '@/lib/datetime';
import { cn } from '@/lib/utils';

interface AssistantItemCardProps {
  item: AssistantItem;
}

const severityConfig: Record<AssistantSeverity, { 
  icon: typeof AlertCircle; 
  iconClass: string;
  bgClass: string;
}> = {
  error: { 
    icon: AlertCircle, 
    iconClass: 'text-destructive',
    bgClass: 'bg-destructive/10'
  },
  warning: { 
    icon: AlertTriangle, 
    iconClass: 'text-warning',
    bgClass: 'bg-warning/10'
  },
  info: { 
    icon: Info, 
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-muted'
  },
  ok: { 
    icon: CheckCircle, 
    iconClass: 'text-success',
    bgClass: 'bg-success/10'
  },
};

const moduleConfig: Record<AssistantModule, { 
  label: string;
  variant: 'default' | 'primary' | 'success' | 'warning' | 'error';
}> = {
  reserveringen: { label: 'Reserveringen', variant: 'primary' },
  keuken: { label: 'Keuken', variant: 'warning' },
  revenue: { label: 'Revenue', variant: 'success' },
  configuratie: { label: 'Configuratie', variant: 'default' },
};

export function AssistantItemCard({ item }: AssistantItemCardProps) {
  const navigate = useNavigate();
  const { icon: SeverityIcon, iconClass, bgClass } = severityConfig[item.severity];
  const { label: moduleLabel, variant: moduleVariant } = moduleConfig[item.module];
  const isClickable = Boolean(item.action_path);

  const handleClick = () => {
    if (item.action_path) {
      navigate(item.action_path);
    }
  };

  return (
    <NestoCard
      className={cn(
        'p-4',
        isClickable && 'cursor-pointer hover:bg-accent/30 transition-colors group'
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Severity Icon with background circle */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          bgClass
        )}>
          <SeverityIcon className={cn('h-4 w-4', iconClass)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {item.title}
            </span>
            {item.kind === 'insight' && (
              <NestoBadge variant="primary" className="text-[10px] px-1.5 py-0.5">
                <Lightbulb className="h-3 w-3 mr-1" />
                Insight
              </NestoBadge>
            )}
          </div>
          {item.message && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.message}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 shrink-0">
          <NestoBadge variant={moduleVariant} className="text-[10px]">
            {moduleLabel}
          </NestoBadge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTimeCompact(item.created_at)}
          </span>
          {isClickable && (
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </NestoCard>
  );
}
