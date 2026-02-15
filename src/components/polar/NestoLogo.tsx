import { cn } from '@/lib/utils';

export interface NestoLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showWordmark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { text: 'text-lg', icon: 20 },
  md: { text: 'text-2xl', icon: 26 },
  lg: { text: 'text-3xl', icon: 32 },
} as const;

function NestoIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M10 23V9h2.4l7.2 10.2V9H22v14h-2.4L12.4 12.8V23H10Z"
        fill="white"
      />
    </svg>
  );
}

export function NestoLogo({ size = 'md', showIcon = true, showWordmark = true, className }: NestoLogoProps) {
  const { text, icon } = sizeMap[size];

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {showIcon && <NestoIcon size={icon} />}
      {showWordmark && (
        <span
          className={cn(text, 'font-extrabold tracking-tight text-primary')}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          nesto
        </span>
      )}
    </span>
  );
}
