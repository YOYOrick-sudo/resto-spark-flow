import * as React from "react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "./NestoBadge";

export interface FormSectionProps {
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

export function FormSection({
  title,
  description,
  badge,
  children,
  className,
  columns = 1,
}: FormSectionProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-6 space-y-5",
        className
      )}
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {badge && (
            <NestoBadge variant="outline" size="sm">
              {badge}
            </NestoBadge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Content grid */}
      <div
        className={cn(
          "grid gap-5",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-[13px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
