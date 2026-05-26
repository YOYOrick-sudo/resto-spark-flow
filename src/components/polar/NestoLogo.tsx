import { cn } from '@/lib/utils';

export interface NestoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showWordmark?: boolean;
  className?: string;
}

// Pure text wordmark — no generated images, razor-sharp at every pixel density
const sizeStyles = {
  sm: 'text-[15px] tracking-[0.18em]',
  md: 'text-[19px] tracking-[0.22em]',
  lg: 'text-[26px] tracking-[0.26em]',
} as const;

export function NestoLogo({
  size = 'md',
  showIcon = true,
  showWordmark = true,
  className,
}: NestoLogoProps) {
  // When only icon is requested, render a minimal "f" glyph
  if (showIcon && !showWordmark) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-light text-foreground select-none',
          sizeStyles[size],
          className
        )}
      >
        f
      </span>
    );
  }

  // Default: wordmark (with or without the small "f" prefix)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[0.35em] font-light text-foreground select-none',
        sizeStyles[size],
        className
      )}
    >
      {showIcon && (
        <span className="opacity-70" style={{ fontWeight: 250 }}>
          f
        </span>
      )}
      <span>foretaste</span>
    </span>
  );
}

