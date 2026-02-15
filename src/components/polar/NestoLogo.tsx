import { cn } from '@/lib/utils';

export interface NestoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showWordmark?: boolean;
  /** 'auto' follows theme (foreground color), 'white' forces white (for dark backgrounds) */
  variant?: 'auto' | 'white';
  className?: string;
}

const sizeMap = {
  sm: { text: 'text-lg', icon: 20 },
  md: { text: 'text-2xl', icon: 26 },
  lg: { text: 'text-3xl', icon: 32 },
} as const;

function NestoIcon({ size, colorClass }: { size: number; colorClass: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={colorClass}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M10 23V9h2.4l7.2 10.2V9H22v14h-2.4L12.4 12.8V23H10Z"
        className="fill-primary"
      />
    </svg>
  );
}

export function NestoLogo({ size = 'md', showIcon = true, showWordmark = true, variant = 'auto', className }: NestoLogoProps) {
  const { text, icon } = sizeMap[size];
  const colorClass = variant === 'white' ? 'text-white' : 'text-foreground';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {showIcon && <NestoIcon size={icon} colorClass={colorClass} />}
      {showWordmark && (
        <span
          className={cn(text, 'font-extrabold tracking-tight', colorClass)}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          nesto
        </span>
      )}
    </span>
  );
}
