import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// TableSkeleton
// ============================================================================

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full overflow-hidden rounded-2xl bg-card shadow-card", className)}>
      {/* Header */}
      <div className="flex gap-4 px-4 pt-4 pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-32" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 px-4 py-3.5"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  "h-4 flex-1",
                  colIndex === 0 ? "max-w-48" : "max-w-24"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CardSkeleton
// ============================================================================

export interface CardSkeletonProps {
  lines?: number;
  showIcon?: boolean;
  showImage?: boolean;
  className?: string;
}

export function CardSkeleton({
  lines = 3,
  showIcon = false,
  showImage = false,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 space-y-4",
        className
      )}
    >
      {showImage && <Skeleton className="h-40 w-full rounded-xl" />}

      <div className="flex items-start gap-3">
        {showIcon && <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-4", i === lines - 2 ? "w-1/2" : "w-full")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ContentSkeleton
// ============================================================================

export interface ContentSkeletonProps {
  lines?: number;
  className?: string;
}

export function ContentSkeleton({
  lines = 4,
  className,
}: ContentSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === 0 && "w-3/4",
            i === lines - 1 && "w-1/2",
            i !== 0 && i !== lines - 1 && "w-full"
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Spinner
// ============================================================================

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        size === "sm" && "h-4 w-4",
        size === "md" && "h-6 w-6",
        size === "lg" && "h-10 w-10",
        className
      )}
    />
  );
}

// ============================================================================
// PageSkeleton - Full page loading state
// ============================================================================

export interface PageSkeletonProps {
  showHeader?: boolean;
  showSidebar?: boolean;
  className?: string;
}

export function PageSkeleton({
  showHeader = true,
  showSidebar = false,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}

      <div className={cn("flex gap-6", showSidebar && "")}>
        {showSidebar && (
          <div className="w-64 flex-shrink-0">
            <CardSkeleton lines={4} />
          </div>
        )}
        <div className="flex-1">
          <TableSkeleton rows={6} columns={5} />
        </div>
      </div>
    </div>
  );
}
