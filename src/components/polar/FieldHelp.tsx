import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FieldHelpProps {
  children: React.ReactNode;
}

/**
 * FieldHelp - Contextual help for form fields
 * 
 * Similar to TitleHelp but designed for inline use with form labels.
 * No header, just content. Use side="top" to avoid covering inputs.
 * 
 * @example
 * <div className="flex items-center gap-1.5">
 *   <Label>Extra stoelen</Label>
 *   <FieldHelp>
 *     <p>Helpertekst hier...</p>
 *   </FieldHelp>
 * </div>
 */
export function FieldHelp({ children }: FieldHelpProps) {
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
        side="top"
        align="start"
        className="w-80 p-0 rounded-dropdown border border-border shadow-md overflow-hidden"
      >
        <div className="px-4 py-3 text-sm space-y-2">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * FieldHelpExample - Styled example block within FieldHelp
 */
export interface FieldHelpExampleProps {
  children: React.ReactNode;
}

export function FieldHelpExample({ children }: FieldHelpExampleProps) {
  return (
    <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground space-y-1 italic">
      {children}
    </div>
  );
}
