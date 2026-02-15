import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NestoTabs, type TabItem } from "./NestoTabs";

export interface DetailPageLayoutProps {
  title: string;
  backLabel?: string;
  backHref: string;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

export function DetailPageLayout({
  title,
  backLabel = "Terug naar overzicht",
  backHref,
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
  headerActions,
}: DetailPageLayoutProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Back button */}
      <Link
        to={backHref}
        className="inline-flex items-center gap-1.5 text-body text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>{backLabel}</span>
      </Link>

      {/* Title row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 text-foreground">
          {title}
        </h1>
        {headerActions && (
          <div className="flex items-center gap-2.5">{headerActions}</div>
        )}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && activeTab && onTabChange && (
        <NestoTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          className="mb-6"
        />
      )}

      {/* Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
