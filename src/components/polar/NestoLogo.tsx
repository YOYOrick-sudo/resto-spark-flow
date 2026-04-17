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

// Heights per size (px). Width auto-scales to preserve aspect ratio.
const heightMap = {
  sm: 20,
  md: 26,
  lg: 32,
} as const;

// Lockup is wider than tall, so render slightly taller for visual parity with the
// previous icon+wordmark combo.
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
  let height = heightMap[size];
  let alt = 'Shouf';

  if (showIcon && showWordmark) {
    src = shoufLockup;
    height = lockupHeightMap[size];
  } else if (showWordmark && !showIcon) {
    src = shoufWordmark;
  } else {
    src = shoufIcon;
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
