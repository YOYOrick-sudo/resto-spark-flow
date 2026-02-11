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
          d="M10 1C10 1 11.5 6.5 10 10C6.5 11.5 1 10 1 10C1 10 6.5 8.5 10 10C11.5 13.5 10 19 10 19C10 19 8.5 13.5 10 10C13.5 8.5 19 10 19 10C19 10 13.5 11.5 10 10Z"
          fill="currentColor"
        />
        {/* Small sparkle star top-right */}
        <path
          d="M19 1C19 1 19.75 3.25 19 4C18.25 4.75 16 5 16 5C16 5 18.25 4.25 19 4C19.75 3.25 22 3 22 3C22 3 19.75 3.75 19 4C18.25 4.75 19 7 19 7C19 7 19.75 4.75 19 4Z"
          fill="currentColor"
        />
      </svg>
    );
  }
);

AssistentIcon.displayName = 'AssistentIcon';
