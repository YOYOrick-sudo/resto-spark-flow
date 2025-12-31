import { NestoSelect, type SelectOption } from "@/components/polar/NestoSelect";
import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@/data/reservations";

export interface ReservationFiltersState {
  status: string;
  shift: string;
  ticketType: string;
}

interface ReservationFiltersProps {
  filters: ReservationFiltersState;
  onFiltersChange: (filters: ReservationFiltersState) => void;
  totalCount: number;
  filteredCount: number;
  className?: string;
}

const statusOptions: SelectOption[] = [
  { value: "", label: "Alle statussen" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "seated", label: "Seated" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

const shiftOptions: SelectOption[] = [
  { value: "", label: "Alle shifts" },
  { value: "ED", label: "Early Dinner (ED)" },
  { value: "LD", label: "Late Dinner (LD)" },
];

const ticketTypeOptions: SelectOption[] = [
  { value: "", label: "Alle types" },
  { value: "Regular", label: "Regular" },
  { value: "Chef's Table Experience", label: "Chef's Table Experience" },
  { value: "Celebration Package", label: "Celebration Package" },
  { value: "Business Dinner", label: "Business Dinner" },
  { value: "Group Dining", label: "Group Dining" },
  { value: "Walk-in", label: "Walk-in" },
];

export function ReservationFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  className,
}: ReservationFiltersProps) {
  const handleFilterChange = (key: keyof ReservationFiltersState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = filters.status || filters.shift || filters.ticketType;

  return (
    <div className={cn("flex items-center gap-4 flex-wrap", className)}>
      {/* Filter dropdowns */}
      <div className="flex items-center gap-2">
        <NestoSelect
          options={statusOptions}
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
          placeholder="Status"
          className="w-[140px]"
        />
        <NestoSelect
          options={shiftOptions}
          value={filters.shift}
          onValueChange={(value) => handleFilterChange("shift", value)}
          placeholder="Shift"
          className="w-[140px]"
        />
        <NestoSelect
          options={ticketTypeOptions}
          value={filters.ticketType}
          onValueChange={(value) => handleFilterChange("ticketType", value)}
          placeholder="Type"
          className="w-[180px]"
        />
      </div>

      {/* Counter */}
      <div className="text-sm text-muted-foreground ml-auto">
        {hasActiveFilters ? (
          <span>
            Tonen <span className="font-medium text-foreground">{filteredCount}</span> van{" "}
            <span className="font-medium text-foreground">{totalCount}</span> reserveringen
          </span>
        ) : (
          <span>
            <span className="font-medium text-foreground">{totalCount}</span> reserveringen
          </span>
        )}
      </div>
    </div>
  );
}
