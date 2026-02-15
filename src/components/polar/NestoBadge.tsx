import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-success-light text-success",
        pending: "bg-pending-light text-pending",
        warning: "bg-warning-light text-warning",
        error: "bg-error-light text-error",
        outline: "border border-border bg-transparent text-foreground",
        "outline-error": "border border-destructive bg-transparent text-destructive",
        soon: "bg-pending text-white",
      },
      size: {
        default: "text-xs px-2.5 py-1",
        sm: "text-caption px-2 py-0.5",
        lg: "text-sm px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface NestoBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

const NestoBadge = React.forwardRef<HTMLSpanElement, NestoBadgeProps>(
  ({ className, variant, size, dot, dotColor, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor || "currentColor" }}
          />
        )}
        {children}
      </span>
    );
  }
);
NestoBadge.displayName = "NestoBadge";

export { NestoBadge, badgeVariants };
