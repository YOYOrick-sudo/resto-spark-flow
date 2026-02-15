import * as React from "react";
import { cn } from "@/lib/utils";
import { NestoButton } from "./NestoButton";
import { LucideIcon } from "lucide-react";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: PageHeaderAction[] | React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className,
}: PageHeaderProps) {
  // Determine if actions is an array of action objects or ReactNode
  const isActionArray = Array.isArray(actions);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-7 border-b border-border",
        "sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-h1 text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-body text-muted-foreground">{subtitle}</p>
        )}
        {description && (
          <p className="text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isActionArray
            ? (actions as PageHeaderAction[]).map((action, index) => (
                <NestoButton
                  key={index}
                  variant={action.variant || "primary"}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </NestoButton>
              ))
            : actions}
        </div>
      )}
    </div>
  );
}
