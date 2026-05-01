// Sprint A.3: Source-pill mapping voor recipe_yield.source
// Allowed sources (A.1 CHECK): industry_default | observed | manual_override | imported | correction
import * as React from "react";
import { cn } from "@/lib/utils";

const SOURCE_CONFIG: Record<string, { label: string; classes: string }> = {
  industry_default: {
    label: "Standaard",
    classes: "bg-muted text-muted-foreground border-border",
  },
  manual_override: {
    label: "Aangepast",
    classes: "bg-primary/10 text-primary border-primary/20",
  },
  correction: {
    label: "Gecorrigeerd",
    classes: "bg-warning/10 text-warning border-warning/20",
  },
  observed: {
    label: "Gemeten",
    classes: "bg-success/10 text-success border-success/20",
  },
  imported: {
    label: "Geïmporteerd",
    classes: "bg-accent text-accent-foreground border-border",
  },
};

export function YieldSourcePill({
  source,
  size = "sm",
}: {
  source: string;
  size?: "xs" | "sm";
}) {
  const cfg = SOURCE_CONFIG[source] ?? {
    label: source,
    classes: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        cfg.classes
      )}
    >
      {cfg.label}
    </span>
  );
}

export function getYieldSourceLabel(source: string): string {
  return SOURCE_CONFIG[source]?.label ?? source;
}
