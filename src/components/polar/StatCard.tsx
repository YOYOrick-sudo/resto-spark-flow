import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-6 space-y-4 dark:border dark:border-border",
        className
      )}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)" }}
    >
      {/* Header with label and icon */}
      <div className="flex items-center justify-between">
        <span className="text-caption uppercase text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className="flex items-center justify-center w-10 h-10 bg-surface-subtle rounded-xl">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-display text-foreground leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-lg font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </div>

      {/* Trend indicator */}
      {trend && (
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            trend.direction === "up" ? "text-success" : "text-error"
          )}
        >
          {trend.direction === "up" ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>
            {Math.abs(trend.value)}% vs vorige week
          </span>
        </div>
      )}
    </div>
  );
}
