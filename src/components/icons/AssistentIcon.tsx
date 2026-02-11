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
        {/* Main 4-pointed sparkle star */}
        <path
          d="M10 2L11.5 7.5L17 10L11.5 12.5L10 18L8.5 12.5L3 10L8.5 7.5Z"
          fill="currentColor"
        />
        {/* Small sparkle star top-right */}
        <path
          d="M19 3L19.75 5.25L22 6L19.75 6.75L19 9L18.25 6.75L16 6L18.25 5.25Z"
          fill="currentColor"
        />
      </svg>
    );
  }
);

AssistentIcon.displayName = 'AssistentIcon';
