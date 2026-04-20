import * as React from "react";
import { Link } from "react-router-dom";
import { Info, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoButton } from "./NestoButton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface PageHeaderHelp {
  /** Body content shown inside the popover. Plain text or JSX. */
  content: React.ReactNode;
  /** Optional CTA rendered at the bottom of the popover. */
  action?: { label: string; href: string };
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  /**
   * Optional inline help. Renders an ⓘ icon next to the title that opens
   * a popover with the supplied content. Prefer this over `subtitle` for
   * how-to / management instructions — keeps the title clean and matches
   * the enterprise-SaaS pattern (Linear, Notion, Stripe).
   */
  help?: PageHeaderHelp;
  actions?: PageHeaderAction[] | React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  help,
  actions,
  className,
}: PageHeaderProps) {
  const isActionArray = Array.isArray(actions);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-7 border-b border-border",
        "sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-h1 text-foreground">{title}</h1>
          {help && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Meer informatie"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/50 cursor-help transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="max-w-xs w-auto p-4 space-y-3"
              >
                <div className="text-sm text-foreground leading-relaxed">
                  {help.content}
                </div>
                {help.action && (
                  <Link to={help.action.href} className="block">
                    <NestoButton variant="outline" size="sm" className="w-full">
                      {help.action.label}
                    </NestoButton>
                  </Link>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
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
