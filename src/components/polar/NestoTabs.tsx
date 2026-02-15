import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface NestoTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function NestoTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: NestoTabsProps) {
  return (
    <div className={cn("border-b border-border", className)}>
      <nav className="flex gap-6" role="tablist" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "relative flex items-center gap-2 pb-3 text-body font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                tab.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "text-small font-semibold",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export interface NestoTabContentProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

export function NestoTabContent({
  value,
  activeValue,
  children,
  className,
}: NestoTabContentProps) {
  if (value !== activeValue) return null;

  return <div className={cn("pt-4", className)}>{children}</div>;
}
