import { Info, Lightbulb } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface TitleHelpProps {
  title: string;
  children: React.ReactNode;
}

export function TitleHelp({ title, children }: TitleHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-primary transition-colors"
          aria-label="Meer informatie"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-80 p-0 shadow-lg border-l-[3px] border-l-primary overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-border">
          <Info className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        
        {/* Body */}
        <div className="px-4 py-3 text-sm space-y-3">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper component voor tip callout
export interface TitleHelpTipProps {
  children: React.ReactNode;
}

export function TitleHelpTip({ children }: TitleHelpTipProps) {
  return (
    <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
      <Lightbulb className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
