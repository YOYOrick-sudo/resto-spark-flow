import { forwardRef } from "react";
import { Rows3, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DensityType } from "./DensityToggle";

interface ReservationFooterProps {
  totalGuests: number;
  waitingCount: number;
  isOpen: boolean;
  className?: string;
  density?: DensityType;
  onDensityChange?: (d: DensityType) => void;
}

export const ReservationFooter = forwardRef<HTMLDivElement, ReservationFooterProps>(
  function ReservationFooter({
    totalGuests,
    waitingCount,
    isOpen,
    className,
    density,
    onDensityChange,
  }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-4 flex-1",
          className
        )}
      >
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium text-foreground">{totalGuests}</span>
            <span className="text-muted-foreground ml-1">gasten vandaag</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-sm">
            <span className="font-medium text-foreground">{waitingCount}</span>
            <span className="text-muted-foreground ml-1">wachtend</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Right side - Status */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full",
              isOpen ? "bg-success" : "bg-error"
            )}
          />
          <span className="text-sm font-medium text-foreground">
            {isOpen ? "Open" : "Gesloten"}
          </span>
        </div>

        {/* Density toggle */}
        {density && onDensityChange && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onDensityChange("compact")}
                className={cn(
                  "transition-colors",
                  density === "compact"
                    ? "text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
                title="Compact"
              >
                <Rows4 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDensityChange("comfortable")}
                className={cn(
                  "transition-colors",
                  density === "comfortable"
                    ? "text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
                title="Comfortable"
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
);
