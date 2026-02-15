import { useState, useMemo, useCallback } from "react";
import { Plus, Calendar } from "lucide-react";
import { EmptyState } from "@/components/polar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SearchBar } from "@/components/polar/SearchBar";
import { ViewToggle, type ViewType } from "@/components/reserveringen/ViewToggle";
import { useDensity } from "@/components/reserveringen/DensityToggle";
import { DateNavigator } from "@/components/reserveringen/DateNavigator";
import { ReservationListView } from "@/components/reserveringen/ReservationListView";
import { ReservationGridView } from "@/components/reserveringen/ReservationGridView";
import { ReservationFooter } from "@/components/reserveringen/ReservationFooter";
import {
  ReservationFilters,
  type ReservationFiltersState,
} from "@/components/reserveringen/ReservationFilters";
// TODO: Replace with Supabase query via useReservations hook
import {
  mockReservations,
  getReservationsForDate,
  getTotalGuestsForDate,
  getGuestDisplayName,
  type Reservation,
} from "@/data/reservations";
import { nestoToast } from "@/lib/nestoToast";

export default function Reserveringen() {
  // State
  const [activeView, setActiveView] = useState<ViewType>("list");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [density, setDensity] = useDensity();
  const [filters, setFilters] = useState<ReservationFiltersState>({
    status: "all",
    shift: "all",
    ticketType: "all",
  });

  // Get formatted date for filtering
  const dateString = format(selectedDate, "yyyy-MM-dd");
  
  // Refresh key to force re-fetch after updates
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleReservationUpdate = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // Filter reservations
  const reservationsForDate = useMemo(() => {
    return getReservationsForDate(dateString);
  }, [dateString, refreshKey]);

  const filteredReservations = useMemo(() => {
    let result = reservationsForDate;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const guestName = getGuestDisplayName(r).toLowerCase();
        return (
          guestName.includes(query) ||
          r.phone.includes(query) ||
          r.email.toLowerCase().includes(query)
        );
      });
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((r) => r.status === filters.status);
    }

    if (filters.shift && filters.shift !== "all") {
      result = result.filter((r) => r.shift === filters.shift);
    }

    if (filters.ticketType && filters.ticketType !== "all") {
      result = result.filter((r) => r.ticketType === filters.ticketType);
    }

    return result;
  }, [reservationsForDate, searchQuery, filters]);

  // Calculate stats
  const totalGuests = getTotalGuestsForDate(dateString);
  const waitingCount = reservationsForDate.filter(
    (r) => r.status === "pending" || r.status === "confirmed"
  ).length;

  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 16 && currentHour < 23;

  // Handlers
  const handleReservationClick = (reservation: Reservation) => {
    nestoToast.info(`Reservering: ${getGuestDisplayName(reservation)}`);
  };

  const handleStatusChange = (reservation: Reservation, newStatus: Reservation["status"]) => {
    nestoToast.success(`Status gewijzigd naar: ${newStatus}`);
  };

  const handleNewReservation = () => {
    nestoToast.info("Nieuwe reservering maken...");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <ViewToggle activeView={activeView} onViewChange={setActiveView} />
        
        <DateNavigator
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        <div className="flex-1 max-w-xs ml-auto">
          <SearchBar
            placeholder="Zoek op naam, telefoon..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <button
          onClick={handleNewReservation}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Reservering
        </button>
      </div>

      {/* Filters row */}
      <ReservationFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={reservationsForDate.length}
        filteredCount={filteredReservations.length}
      />

      {/* Content area */}
      <div className={cn("flex-1 pt-2", activeView === "grid" ? "overflow-hidden" : "overflow-auto")}>
        <div className={cn("bg-card border border-border rounded-2xl overflow-hidden", activeView === "grid" && "h-full")}>
          {activeView === "list" && (
            <ReservationListView
              reservations={filteredReservations}
              onReservationClick={handleReservationClick}
              onStatusChange={handleStatusChange}
              density={density}
            />
          )}

          {activeView === "grid" && (
            <ReservationGridView
              selectedDate={selectedDate}
              reservations={filteredReservations}
              onReservationClick={handleReservationClick}
              onReservationUpdate={handleReservationUpdate}
              density={density}
            />
          )}

          {activeView === "calendar" && (
            <div className="flex items-center justify-center py-16">
              <EmptyState
                icon={Calendar}
                title="Kalenderweergave"
                description="Deze weergave wordt binnenkort beschikbaar."
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <ReservationFooter
        totalGuests={totalGuests}
        waitingCount={waitingCount}
        isOpen={isOpen}
        density={density}
        onDensityChange={setDensity}
      />
    </div>
  );
}
