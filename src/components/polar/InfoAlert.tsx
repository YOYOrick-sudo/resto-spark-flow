import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export interface InfoAlertProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  variant?: "info" | "warning" | "success" | "error";
  className?: string;
  children?: React.ReactNode;
}

const variantStyles = {
  info: {
    container: "bg-primary/10 border-primary/20",
    icon: "text-primary",
    defaultIcon: Info,
  },
  warning: {
    container: "bg-warning/10 border-warning/20",
    icon: "text-warning",
    defaultIcon: AlertTriangle,
  },
  success: {
    container: "bg-success/10 border-success/20",
    icon: "text-success",
    defaultIcon: CheckCircle,
  },
  error: {
    container: "bg-destructive/10 border-destructive/20",
    icon: "text-destructive",
    defaultIcon: XCircle,
  },
};

export function InfoAlert({
  icon,
  title,
  description,
  variant = "info",
  className,
  children,
}: InfoAlertProps) {
  const styles = variantStyles[variant];
  const Icon = icon || styles.defaultIcon;

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl border",
        styles.container,
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn("h-5 w-5", styles.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
