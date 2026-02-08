import { forwardRef } from "react";
import { PenSquare, Rows3, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DensityType } from "./DensityToggle";

interface ReservationFooterProps {
  totalGuests: number;
  waitingCount: number;
  isOpen: boolean;
  className?: string;
  onNotesClick?: () => void;
  density?: DensityType;
  onDensityChange?: (d: DensityType) => void;
}

export const ReservationFooter = forwardRef<HTMLDivElement, ReservationFooterProps>(
  function ReservationFooter({
    totalGuests,
    waitingCount,
    isOpen,
    className,
    onNotesClick,
    density,
    onDensityChange,
  }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between px-4 py-3 border-t border-border bg-card",
          className
        )}
      >
        {/* Left side - Notes */}
        <button
          onClick={onNotesClick}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <PenSquare className="h-4 w-4" />
          <span>Notities</span>
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Center - Stats */}
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
