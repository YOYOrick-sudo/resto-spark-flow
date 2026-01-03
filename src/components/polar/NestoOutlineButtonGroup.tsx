import * as React from "react";
import { cn } from "@/lib/utils";

export interface OutlineButtonOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NestoOutlineButtonGroupProps {
  options: OutlineButtonOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-[13px]",
  lg: "px-4 py-2 text-sm",
};

export function NestoOutlineButtonGroup({
  options,
  value,
  onChange,
  size = "md",
  className,
}: NestoOutlineButtonGroupProps) {
  return (
    <div className={cn("inline-flex gap-2", className)}>
      {options.map((option) => {
        const isSelected = option.value === value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            className={cn(
              "rounded-button font-medium transition-all duration-200",
              "border-[1.5px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              sizeClasses[size],
              isSelected
                ? "bg-primary/10 border-primary text-primary"
                : "bg-transparent border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
