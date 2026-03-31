import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SparkleIndicatorProps {
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'muted' | 'accent';
  className?: string;
}

export function SparkleIndicator({
  label,
  size = 'sm',
  variant = 'muted',
  className,
}: SparkleIndicatorProps) {
  const sparkle = (
    <span
      className={cn(
        'inline-flex items-center transition-opacity duration-200 select-none',
        size === 'sm' ? 'text-xs leading-none' : 'text-sm leading-none',
        variant === 'muted'
          ? 'text-muted-foreground opacity-60'
          : 'text-primary opacity-80',
        className,
      )}
      aria-hidden="true"
    >
      ✦
    </span>
  );

  if (!label) return sparkle;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{sparkle}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
