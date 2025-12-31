import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroupOptions {
  label: string;
  options: SelectOption[];
}

export interface NestoSelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroupOptions[];
  error?: string;
  disabled?: boolean;
  className?: string;
}

const NestoSelect = React.forwardRef<HTMLButtonElement, NestoSelectProps>(
  (
    {
      label,
      placeholder = "Selecteer...",
      value,
      onValueChange,
      options = [],
      groups = [],
      error,
      disabled,
      className,
    },
    ref
  ) => {
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
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger
            ref={ref}
            id={id}
            className={cn(
              "h-10 w-full rounded-button border-[1.5px] border-border bg-card px-3 py-2.5 text-[15px]",
              "focus:!border-primary focus:ring-0 focus:ring-offset-0",
              "data-[placeholder]:text-muted-foreground",
              error && "border-destructive focus:border-destructive",
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="rounded-card border border-border bg-card">
            {options.length > 0 &&
              options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="cursor-pointer text-[15px] focus:bg-accent"
                >
                  {option.label}
                </SelectItem>
              ))}
            {groups.length > 0 &&
              groups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className="text-label text-muted-foreground">
                    {group.label}
                  </SelectLabel>
                  {group.options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className="cursor-pointer text-[15px] focus:bg-accent"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
          </SelectContent>
        </Select>
        {error && (
          <p className="mt-1.5 text-small text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
NestoSelect.displayName = "NestoSelect";

export { NestoSelect };
