import { forwardRef } from "react";
import { PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationFooterProps {
  totalGuests: number;
  waitingCount: number;
  isOpen: boolean;
  className?: string;
  onNotesClick?: () => void;
}

export const ReservationFooter = forwardRef<HTMLDivElement, ReservationFooterProps>(
  function ReservationFooter({
    totalGuests,
    waitingCount,
    isOpen,
    className,
    onNotesClick,
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

        {/* Center - Stats */}
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="font-semibold text-foreground">{totalGuests}</span>
            <span className="text-muted-foreground ml-1">gasten vandaag</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-foreground">{waitingCount}</span>
            <span className="text-muted-foreground ml-1">wachtend</span>
          </div>
        </div>

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
      </div>
    );
  }
);
