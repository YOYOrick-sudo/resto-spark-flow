import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  size?: "sm" | "default";
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Zoeken...",
  className,
  autoFocus = false,
  size = "default",
}: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <Search className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none", size === "sm" ? "left-3 h-3.5 w-3.5" : "left-4 h-4 w-4")} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      className={cn(
        "w-full rounded-button",
        size === "sm" ? "h-8 pl-9 pr-8 text-xs" : "h-11 pl-11 pr-10 text-sm",
        "bg-background border-[1.5px] border-border",
        "text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-0 focus:!border-primary",
        "transition-all duration-200"
      )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Zoekopdracht wissen"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
