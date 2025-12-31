import * as React from "react";
import { cn } from "@/lib/utils";
import { NestoSelect, type SelectOption } from "./NestoSelect";
import { NestoButton } from "./NestoButton";
import { X } from "lucide-react";

export interface FilterDefinition {
  id: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export interface FilterSidebarProps {
  filters: FilterDefinition[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  onClear?: () => void;
  className?: string;
  title?: string;
}

export function FilterSidebar({
  filters,
  values,
  onChange,
  onClear,
  className,
  title = "Filters",
}: FilterSidebarProps) {
  const hasActiveFilters = Object.values(values).some((v) => v && v !== "");

  return (
    <div
      className={cn(
        "bg-secondary border border-border rounded-2xl p-5 space-y-5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {hasActiveFilters && onClear && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>Wissen</span>
          </button>
        )}
      </div>

      {/* Filter fields */}
      <div className="space-y-4">
        {filters.map((filter) => (
          <NestoSelect
            key={filter.id}
            label={filter.label}
            placeholder={filter.placeholder || `Alle ${filter.label.toLowerCase()}`}
            options={filter.options}
            value={values[filter.id] || ""}
            onValueChange={(value) => onChange(filter.id, value)}
          />
        ))}
      </div>

      {/* Clear button for mobile */}
      {hasActiveFilters && onClear && (
        <NestoButton
          variant="outline"
          size="sm"
          onClick={onClear}
          className="w-full sm:hidden"
        >
          Filters wissen
        </NestoButton>
      )}
    </div>
  );
}
