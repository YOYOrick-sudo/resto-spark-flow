import { useState, useMemo, useCallback } from "react";
import { Plus, Footprints, Calendar } from "lucide-react";
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
import { useReservations } from "@/hooks/useReservations";
import { getDisplayName } from "@/lib/reservationUtils";
import type { Reservation } from "@/types/reservation";
import { nestoToast } from "@/lib/nestoToast";
import { ReservationDetailPanel, CreateReservationSheet, WalkInSheet } from "@/components/reservations";

export default function Reserveringen() {
  const [activeView, setActiveView] = useState<ViewType>("list");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [density, setDensity] = useDensity();
  const [filters, setFilters] = useState<ReservationFiltersState>({
    status: "all",
    shift: "all",
    ticketType: "all",
  });

  // Panel & sheet state
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [walkInSheetOpen, setWalkInSheetOpen] = useState(false);

  const dateString = format(selectedDate, "yyyy-MM-dd");

  const { data: reservationsForDate = [], isLoading } = useReservations({ date: dateString });

  const filteredReservations = useMemo(() => {
    let result = reservationsForDate;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const guestName = getDisplayName(r).toLowerCase();
        return (
          guestName.includes(query) ||
          (r.customer?.phone_number || '').includes(query) ||
          (r.customer?.email || '').toLowerCase().includes(query)
        );
      });
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((r) => r.status === filters.status);
    }

    if (filters.shift && filters.shift !== "all") {
      result = result.filter((r) => r.shift_name === filters.shift);
    }

    if (filters.ticketType && filters.ticketType !== "all") {
      result = result.filter((r) => r.ticket_name === filters.ticketType);
    }

    return result;
  }, [reservationsForDate, searchQuery, filters]);

  const totalGuests = useMemo(
    () => reservationsForDate
      .filter(r => r.status !== 'cancelled' && r.status !== 'no_show')
      .reduce((sum, r) => sum + r.party_size, 0),
    [reservationsForDate]
  );

  const waitingCount = reservationsForDate.filter(
    (r) => r.status === "draft" || r.status === "confirmed"
  ).length;

  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 16 && currentHour < 23;

  const handleReservationClick = useCallback((reservation: Reservation) => {
    setSelectedReservationId(reservation.id);
  }, []);

  const handleStatusChange = (reservation: Reservation, newStatus: Reservation["status"]) => {
    nestoToast.success(`Status gewijzigd naar: ${newStatus}`);
  };

  const detailPanelOpen = selectedReservationId !== null;

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className={cn("flex flex-col flex-1 min-w-0", detailPanelOpen && "lg:pr-0")}>
        <h1 className="text-2xl font-semibold text-foreground">Reserveringen</h1>

        <div className="flex items-center gap-4 flex-wrap pt-4">
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
            onClick={() => setWalkInSheetOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-button border border-input bg-background text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Footprints className="h-4 w-4" />
            Walk-in
          </button>

          <button
            onClick={() => setCreateSheetOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Reservering
          </button>
        </div>

        <ReservationFilters
          className="pt-3"
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={reservationsForDate.length}
          filteredCount={filteredReservations.length}
        />

        <div className={cn("flex-1 pt-4", activeView === "grid" ? "overflow-hidden" : "overflow-auto")}>
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

        <ReservationFooter
          totalGuests={totalGuests}
          waitingCount={waitingCount}
          isOpen={isOpen}
          density={density}
          onDensityChange={setDensity}
        />
      </div>

      {/* Detail Panel */}
      <ReservationDetailPanel
        reservationId={selectedReservationId}
        open={detailPanelOpen}
        onClose={() => setSelectedReservationId(null)}
      />

      {/* Create Sheet */}
      <CreateReservationSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        defaultDate={selectedDate}
      />

      {/* Walk-in Sheet */}
      <WalkInSheet
        open={walkInSheetOpen}
        onClose={() => setWalkInSheetOpen(false)}
      />
    </div>
  );
}
