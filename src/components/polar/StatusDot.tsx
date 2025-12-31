import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusDotProps {
  status: "success" | "warning" | "error" | "neutral";
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

export function StatusDot({
  status,
  size = "md",
  pulse = false,
  className,
}: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full flex-shrink-0",
        // Size
        size === "sm" && "h-1.5 w-1.5",
        size === "md" && "h-2 w-2",
        // Status colors
        status === "success" && "bg-success",
        status === "warning" && "bg-warning",
        status === "error" && "bg-destructive",
        status === "neutral" && "bg-muted-foreground",
        // Pulse animation
        pulse && "animate-pulse",
        className
      )}
    />
  );
}
