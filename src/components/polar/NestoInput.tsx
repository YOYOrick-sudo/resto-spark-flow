import * as React from "react";
import { cn } from "@/lib/utils";

export interface NestoInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const NestoInput = React.forwardRef<HTMLInputElement, NestoInputProps>(
  ({ className, type, label, error, leftIcon, rightIcon, ...props }, ref) => {
    const id = React.useId();
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-2 block text-label text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            type={type}
            className={cn(
              "flex h-10 w-full rounded-button border-[1.5px] border-border bg-card px-3 py-2.5 text-body text-foreground transition-colors",
              "placeholder:text-muted-foreground",
              "focus:!border-primary focus:outline-none focus:ring-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-destructive focus:border-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-small text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
NestoInput.displayName = "NestoInput";

export { NestoInput };
