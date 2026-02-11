import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AssistentIconProps {
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
}

export const AssistentIcon = forwardRef<SVGSVGElement, AssistentIconProps>(
  ({ size = 16, className, color, strokeWidth, absoluteStrokeWidth, ...rest }, ref) => {
    const s = typeof size === 'string' ? parseInt(size, 10) || 16 : size;
    return (
      <svg
        ref={ref}
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('text-primary', className)}
      >
        {/* Main 4-pointed sparkle — sharp geometric star */}
        <path
          d="M12 1L14 9L22 12L14 15L12 23L10 15L2 12L10 9Z"
          fill="currentColor"
        />
        {/* Small accent sparkle top-right */}
        <path
          d="M20 1L20.75 3.75L23.5 4.5L20.75 5.25L20 8L19.25 5.25L16.5 4.5L19.25 3.75Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    );
  }
);

AssistentIcon.displayName = 'AssistentIcon';
