import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface TitleHelpProps {
  content: string;
}

export function TitleHelp({ content }: TitleHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Meer informatie"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-60 p-3 shadow-sm"
      >
        <p className="text-sm">{content}</p>
      </PopoverContent>
    </Popover>
  );
}
