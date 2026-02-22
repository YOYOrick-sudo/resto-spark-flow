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
        "bg-card rounded-xl p-4 space-y-2 border border-border/50 shadow-card",
        className
      )}
    >
      {/* Header with label and icon */}
      <div className="flex items-center justify-between">
        <span className="text-caption uppercase text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className="flex items-center justify-center w-8 h-8 bg-surface-subtle rounded-lg">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-foreground leading-none">
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
