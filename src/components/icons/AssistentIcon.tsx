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
  ({ size = 16, className, ...rest }, ref) => {
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
        {...rest}
      >
        {/* Main 4-pointed star */}
        <path
          d="M12 2C12 2 14.5 8.5 12 12C9.5 8.5 12 2 12 2Z"
          fill="currentColor"
        />
        <path
          d="M12 22C12 22 9.5 15.5 12 12C14.5 15.5 12 22 12 22Z"
          fill="currentColor"
        />
        <path
          d="M2 12C2 12 8.5 9.5 12 12C8.5 14.5 2 12 2 12Z"
          fill="currentColor"
        />
        <path
          d="M22 12C22 12 15.5 14.5 12 12C15.5 9.5 22 12 22 12Z"
          fill="currentColor"
        />
        {/* Small star top-right */}
        <circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" />
      </svg>
    );
  }
);

AssistentIcon.displayName = 'AssistentIcon';
