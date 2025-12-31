import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Package } from "lucide-react";
import { NestoButton } from "./NestoButton";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" && "py-6 gap-2",
        size === "md" && "py-12 gap-3",
        size === "lg" && "py-20 gap-4",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted",
          size === "sm" && "h-10 w-10",
          size === "md" && "h-14 w-14",
          size === "lg" && "h-20 w-20"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            size === "sm" && "h-5 w-5",
            size === "md" && "h-7 w-7",
            size === "lg" && "h-10 w-10"
          )}
        />
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            "font-semibold text-foreground",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg"
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              "text-muted-foreground max-w-sm",
              size === "sm" && "text-xs",
              size === "md" && "text-sm",
              size === "lg" && "text-base"
            )}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <NestoButton
          onClick={action.onClick}
          size={size === "lg" ? "default" : "sm"}
          className="mt-2"
        >
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </NestoButton>
      )}
    </div>
  );
}
