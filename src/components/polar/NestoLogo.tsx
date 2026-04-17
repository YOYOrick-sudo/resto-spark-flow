import { cn } from '@/lib/utils';
import shoufIcon from '@/assets/shouf-icon.png';
import shoufLockup from '@/assets/shouf-lockup.png';
import shoufWordmark from '@/assets/shouf-wordmark.png';

export interface NestoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showWordmark?: boolean;
  className?: string;
}

// Separate height maps per render mode so each asset's optical weight
// matches the old Nesto SVG. Width auto-scales to preserve aspect ratio.
const iconHeightMap = {
  sm: 22,
  md: 28,
  lg: 34,
} as const;

const wordmarkHeightMap = {
  sm: 24,
  md: 34,
  lg: 42,
} as const;

const lockupHeightMap = {
  sm: 22,
  md: 30,
  lg: 38,
} as const;

export function NestoLogo({
  size = 'md',
  showIcon = true,
  showWordmark = true,
  className,
}: NestoLogoProps) {
  let src = shoufIcon;
  let height: number = iconHeightMap[size];
  const alt = 'Shouf';

  if (showIcon && showWordmark) {
    src = shoufLockup;
    height = lockupHeightMap[size];
  } else if (showWordmark && !showIcon) {
    src = shoufWordmark;
    height = wordmarkHeightMap[size];
  } else {
    src = shoufIcon;
    height = iconHeightMap[size];
  }

  return (
    <span className={cn('inline-flex items-center', className)}>
      <img
        src={src}
        alt={alt}
        style={{ height, width: 'auto' }}
        draggable={false}
      />
    </span>
  );
}
