import * as React from "react";
import { format, parse } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export interface NestoDatePickerProps {
  /** Selected date as Date object */
  value?: Date;
  /** Callback when date changes */
  onChange: (date: Date | undefined) => void;
  /** Label above the picker */
  label?: string;
  /** Placeholder when no date selected */
  placeholder?: string;
  /** Disable interaction */
  disabled?: boolean;
  /** Additional classes on trigger */
  className?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
}

/**
 * Helper: convert a yyyy-MM-dd string to Date (local timezone).
 * Returns undefined for empty/invalid strings.
 */
export function dateFromString(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, "yyyy-MM-dd", new Date());
  return isNaN(d.getTime()) ? undefined : d;
}

/** Helper: convert Date to yyyy-MM-dd string */
export function dateToString(d: Date | undefined): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

const NestoDatePicker = React.forwardRef<HTMLButtonElement, NestoDatePickerProps>(
  (
    {
      value,
      onChange,
      label,
      placeholder = "Kies datum",
      disabled = false,
      className,
      minDate,
      maxDate,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-label text-muted-foreground">
            {label}
          </label>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-10 min-h-[44px] w-full items-center gap-2 rounded-button border-[1.5px] border-border bg-card px-3 py-2.5 text-body text-foreground transition-colors",
                "hover:border-primary/50 focus:!border-primary focus:outline-none focus:ring-0",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !value && "text-muted-foreground",
                className
              )}
            >
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-left flex-1">
                {value ? format(value, "d MMMM yyyy", { locale: nl }) : placeholder}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(d) => {
                onChange(d);
                setOpen(false);
              }}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
NestoDatePicker.displayName = "NestoDatePicker";

export { NestoDatePicker };
