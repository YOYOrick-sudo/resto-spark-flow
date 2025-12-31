import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Check } from "lucide-react";

export interface MethodCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function MethodCard({
  icon: Icon,
  title,
  description,
  selected = false,
  onClick,
  disabled = false,
  className,
}: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-start gap-4 w-full p-5 rounded-2xl border-2 text-left transition-all duration-200",
        // Default state
        !selected && !disabled && "border-border bg-card hover:border-primary/40 hover:shadow-sm",
        // Selected state
        selected && "border-primary bg-card shadow-sm",
        // Disabled state
        disabled && "border-border bg-muted cursor-not-allowed opacity-60",
        className
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-xl transition-colors",
          selected ? "bg-primary/10" : "bg-accent"
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6 transition-colors",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-base font-semibold transition-colors",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3 flex items-center justify-center h-5 w-5 rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

// ============================================================================
// MethodCardGroup - For grouping multiple method cards
// ============================================================================

export interface MethodCardGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function MethodCardGroup({ children, className }: MethodCardGroupProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </div>
  );
}
