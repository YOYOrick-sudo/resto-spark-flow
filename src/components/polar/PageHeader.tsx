import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-7 border-b border-border",
        "sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-[28px] font-semibold text-foreground leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[15px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
