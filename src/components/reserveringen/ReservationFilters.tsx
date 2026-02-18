import { NestoSelect, type SelectOption } from "@/components/polar/NestoSelect";
import { SearchBar } from "@/components/polar/SearchBar";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type ReservationStatus } from "@/types/reservation";

export interface ReservationFiltersState {
  status: string;
  shift: string;
  ticketType: string;
}

interface ReservationFiltersProps {
  filters: ReservationFiltersState;
  onFiltersChange: (filters: ReservationFiltersState) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
  className?: string;
}

const statusOrder: ReservationStatus[] = [
  'draft', 'confirmed', 'pending_payment', 'option',
  'seated', 'completed', 'no_show', 'cancelled'
];

const statusOptions: SelectOption[] = [
  { value: "all", label: "Alle statussen" },
  ...statusOrder.map((status) => ({
    value: status,
    label: STATUS_CONFIG[status].label,
  })),
];

const shiftOptions: SelectOption[] = [
  { value: "all", label: "Alle shifts" },
];

const ticketTypeOptions: SelectOption[] = [
  { value: "all", label: "Alle types" },
];

export function ReservationFilters({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
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

  const hasActiveFilters = filters.status !== "all" || filters.shift !== "all" || filters.ticketType !== "all";

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      {/* Filter dropdowns */}
      <div className="flex items-center gap-2">
        <NestoSelect
          options={statusOptions}
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
          placeholder="Status"
          size="sm"
          className="w-[140px]"
        />
        <NestoSelect
          options={shiftOptions}
          value={filters.shift}
          onValueChange={(value) => handleFilterChange("shift", value)}
          placeholder="Shift"
          size="sm"
          className="w-[130px]"
        />
        <NestoSelect
          options={ticketTypeOptions}
          value={filters.ticketType}
          onValueChange={(value) => handleFilterChange("ticketType", value)}
          placeholder="Type"
          size="sm"
          className="w-[130px]"
        />
      </div>

      {/* Search */}
      <div className="w-[180px]">
        <SearchBar
          placeholder="Zoek op naam, telefoon..."
          value={searchQuery}
          onChange={onSearchChange}
          size="sm"
        />
      </div>

      {/* Counter */}
      <div className="text-xs text-muted-foreground ml-auto">
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
