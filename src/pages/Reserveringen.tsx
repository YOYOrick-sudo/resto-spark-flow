import { useState, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { NestoButton } from "@/components/polar/NestoButton";
import { SearchBar } from "@/components/polar/SearchBar";
import { ViewToggle, type ViewType } from "@/components/reserveringen/ViewToggle";
import { DateNavigator } from "@/components/reserveringen/DateNavigator";
import { ReservationListView } from "@/components/reserveringen/ReservationListView";
import { ReservationGridView } from "@/components/reserveringen/ReservationGridView";
import { ReservationFooter } from "@/components/reserveringen/ReservationFooter";
import {
  ReservationFilters,
  type ReservationFiltersState,
} from "@/components/reserveringen/ReservationFilters";
import {
  mockReservations,
  getReservationsForDate,
  getTotalGuestsForDate,
  getGuestDisplayName,
  type Reservation,
} from "@/data/reservations";
import { toast } from "sonner";

export default function Reserveringen() {
  // State
  const [activeView, setActiveView] = useState<ViewType>("list");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
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

    // Apply search filter
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

    // Apply status filter
    if (filters.status && filters.status !== "all") {
      result = result.filter((r) => r.status === filters.status);
    }

    // Apply shift filter
    if (filters.shift && filters.shift !== "all") {
      result = result.filter((r) => r.shift === filters.shift);
    }

    // Apply ticket type filter
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

  // Check if currently open (simple logic: between 16:00 and 23:00)
  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 16 && currentHour < 23;

  // Handlers
  const handleReservationClick = (reservation: Reservation) => {
    toast.info(`Reservering: ${getGuestDisplayName(reservation)}`);
    // TODO: Open reservation detail sheet
  };

  const handleStatusChange = (reservation: Reservation, newStatus: Reservation["status"]) => {
    toast.success(`Status gewijzigd naar: ${newStatus}`);
    // TODO: Update reservation status
  };

  const handleNewReservation = () => {
    toast.info("Nieuwe reservering maken...");
    // TODO: Open new reservation form
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 p-4 pb-0">
        {/* Top row: View toggle, date navigator, search, new button */}
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

          <NestoButton onClick={handleNewReservation} leftIcon={<Plus className="h-4 w-4" />}>
            Reservering
          </NestoButton>
        </div>

        {/* Filters row */}
        <ReservationFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={reservationsForDate.length}
          filteredCount={filteredReservations.length}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4 pt-2">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {activeView === "list" && (
            <ReservationListView
              reservations={filteredReservations}
              onReservationClick={handleReservationClick}
              onStatusChange={handleStatusChange}
            />
          )}

          {activeView === "grid" && (
            <ReservationGridView
              selectedDate={selectedDate}
              reservations={filteredReservations}
              onReservationClick={handleReservationClick}
              onReservationUpdate={handleReservationUpdate}
            />
          )}

          {activeView === "calendar" && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Kalender weergave komt in Fase 4d
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <ReservationFooter
        totalGuests={totalGuests}
        waitingCount={waitingCount}
        isOpen={isOpen}
      />
    </div>
  );
}
