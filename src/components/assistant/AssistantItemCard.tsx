import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Lightbulb, ChevronRight, X } from 'lucide-react';
import { Signal, SignalSeverity, SignalModule, SIGNAL_MODULE_CONFIGS } from '@/types/signals';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { formatDateTimeCompact } from '@/lib/datetime';
import { useDismissSignal } from '@/hooks/useDismissSignal';
import { cn } from '@/lib/utils';

interface AssistantItemCardProps {
  item: Signal;
}

const severityConfig: Record<SignalSeverity, { 
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

function getModuleConfig(module: SignalModule) {
  const config = SIGNAL_MODULE_CONFIGS.find(c => c.value === module);
  return config || { label: module, variant: 'default' as const };
}

export function AssistantItemCard({ item }: AssistantItemCardProps) {
  const navigate = useNavigate();
  const dismissMutation = useDismissSignal();
  const severity = severityConfig[item.severity] || severityConfig.info;
  const { icon: SeverityIcon, iconClass, bgClass } = severity;
  const { label: moduleLabel, variant: moduleVariant } = getModuleConfig(item.module);
  const isClickable = Boolean(item.action_path);

  const handleClick = () => {
    if (item.action_path) {
      navigate(item.action_path);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissMutation.mutate(item.id);
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
        {/* Severity Icon */}
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
          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
            className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Signaal verbergen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </NestoCard>
  );
}
