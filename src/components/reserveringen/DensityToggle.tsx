import { useState, useEffect } from "react";
import { Rows3, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DensityType = "compact" | "comfortable";

const STORAGE_KEY = "nesto-density";

interface DensityToggleProps {
  density: DensityType;
  onDensityChange: (density: DensityType) => void;
  className?: string;
}

const options: { id: DensityType; icon: typeof Rows4; label: string }[] = [
  { id: "compact", icon: Rows4, label: "Compact" },
  { id: "comfortable", icon: Rows3, label: "Comfortable" },
];

export function useDensity(): [DensityType, (d: DensityType) => void] {
  const [density, setDensityState] = useState<DensityType>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "compact" || stored === "comfortable") return stored;
    } catch {}
    return "compact";
  });

  const setDensity = (d: DensityType) => {
    setDensityState(d);
    try {
      localStorage.setItem(STORAGE_KEY, d);
    } catch {}
  };

  return [density, setDensity];
}

export function DensityToggle({
  density,
  onDensityChange,
  className,
}: DensityToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 bg-secondary rounded-lg p-1",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = density === option.id;

        return (
          <button
            key={option.id}
            onClick={() => onDensityChange(option.id)}
            className={cn(
              "p-2 rounded-md transition-all",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            title={option.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
