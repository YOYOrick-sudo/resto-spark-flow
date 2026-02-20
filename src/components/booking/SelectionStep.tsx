import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useBooking, type AvailableSlot, type AvailableShift, type TicketInfo } from '@/contexts/BookingContext';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Minus, Plus, Check, Calendar as CalendarIcon, List, Users, Clock,
} from 'lucide-react';

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const DAY_NAMES_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MONTH_NAMES_FULL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function SelectionStep() {
  const {
    config, data, availableShifts, availabilityLoading,
    availableDates, availableDatesLoading,
    setDate, setPartySize, setSelectedSlot, setSelectedTicket,
    loadAvailability, loadAvailableDates,
  } = useBooking();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const dates = useMemo(() => 
    Array.from({ length: 90 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    }), [today]);

  const tickets = config?.tickets ?? [];
  const minParty = config?.min_party_size ?? 1;
  const maxParty = config?.max_party_size ?? 10;

  // Flatten all available slots from shifts
  const flatSlots = useMemo(() => {
    const result: Array<{ slot: AvailableSlot; shift: AvailableShift }> = [];
    for (const shift of availableShifts) {
      for (const slot of shift.slots) {
        // If a ticket is selected, only show slots for that ticket
        if (data.selectedTicket && slot.ticket_id !== data.selectedTicket.id) continue;
        result.push({ slot, shift });
      }
    }
    // Deduplicate by time (take first available per time)
    const seen = new Map<string, typeof result[0]>();
    for (const item of result) {
      if (!seen.has(item.slot.time) || (item.slot.available && !seen.get(item.slot.time)!.slot.available)) {
        seen.set(item.slot.time, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.slot.time.localeCompare(b.slot.time));
  }, [availableShifts, data.selectedTicket]);

  // Convert selected date string to day index
  const selectedDayIndex = useMemo(() => {
    if (!data.date) return null;
    const sel = new Date(data.date + 'T00:00:00');
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((sel.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  }, [data.date, today]);

  // Auto-select first date on mount
  useEffect(() => {
    if (!data.date && config) {
      const firstDate = formatDateStr(dates[0]);
      setDate(firstDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Load availability when date or party size changes
  useEffect(() => {
    if (data.date && config) {
      loadAvailability(data.date, data.party_size);
    }
  }, [data.date, data.party_size, config, loadAvailability]);

  // Load available dates when month view changes
  useEffect(() => {
    if (calendarMode && config) {
      loadAvailableDates(viewMonth.getFullYear(), viewMonth.getMonth() + 1, data.party_size);
    }
  }, [calendarMode, viewMonth, data.party_size, config, loadAvailableDates]);

  // Check if ticket is available for current selection
  const isTicketAvailable = useCallback((ticket: TicketInfo) => {
    if (data.party_size < ticket.min_party_size || data.party_size > ticket.max_party_size) return false;
    // Check if any slots exist for this ticket
    for (const shift of availableShifts) {
      for (const slot of shift.slots) {
        if (slot.ticket_id === ticket.id && slot.available) return true;
      }
    }
    return false;
  }, [availableShifts, data.party_size]);

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleDateSelect = (dayIndex: number) => {
    const dateStr = formatDateStr(dates[dayIndex]);
    setDate(dateStr);
    // Clear slot if it's no longer valid
    // (availability will reload via effect)
    setTimeout(() => {
      scrollRef.current?.querySelector(`[data-day="${dayIndex}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 50);
  };

  const handleCalendarDayClick = (date: Date) => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayIndex = Math.round((date.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < 90) {
      handleDateSelect(dayIndex);
    }
    setCalendarMode(false);
  };

  const handleTicketSelect = (ticket: TicketInfo) => {
    setSelectedTicket(ticket);
    setSelectorOpen(false);
  };

  const handleTimeSelect = (item: { slot: AvailableSlot; shift: AvailableShift }) => {
    setSelectedSlot(item.slot, item.shift);
  };

  // Build month grid
  const buildMonthGrid = (month: Date) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ date: Date; dayIndex: number; inMonth: boolean; disabled: boolean }> = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: new Date(0), dayIndex: -1, inMonth: false, disabled: true });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, m, d);
      const dayIndex = Math.round((date.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
      const dateStr = formatDateStr(date);
      const disabled = dayIndex < 0 || dayIndex >= 90 || (availableDates.length > 0 && !availableDates.includes(dateStr));
      cells.push({ date, dayIndex, inMonth: true, disabled });
    }
    return cells;
  };

  // Determine slot availability level
  const getSlotAvailability = (slot: AvailableSlot): 'high' | 'medium' | 'low' => {
    if (slot.slot_type === 'squeeze') return 'low';
    if (slot.reason_code === 'limited') return 'medium';
    return 'high';
  };

  // Has full selection?
  const hasFullSelection = !!data.date && !!data.selectedSlot && !!data.selectedTicket;

  // Collapse selector when full selection is made
  useEffect(() => {
    if (hasFullSelection) setSelectorOpen(false);
  }, [hasFullSelection]);

  return (
    <div className="space-y-5 px-5">
      {/* Compact selector dropdown */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => setSelectorOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {selectorOpen ? (
            <>
              <span className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Je selectie</span>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </>
          ) : (
            <>
              <span className="truncate font-medium text-gray-700">
                {data.date && selectedDayIndex !== null
                  ? `${DAY_NAMES[dates[selectedDayIndex].getDay()]} ${dates[selectedDayIndex].getDate()} ${MONTH_NAMES[dates[selectedDayIndex].getMonth()]}`
                  : '—'}
                {' · '}{data.party_size} gasten{' · '}{data.selectedSlot?.time ?? '—'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
            </>
          )}
        </button>

        {selectorOpen && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-5">
            {/* Date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</span>
                </div>
                <button
                  onClick={() => {
                    setCalendarMode(m => !m);
                    if (!calendarMode && selectedDayIndex !== null) {
                      setViewMonth(dates[selectedDayIndex]);
                    }
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  {calendarMode ? <List className="w-3.5 h-3.5" /> : <CalendarIcon className="w-3.5 h-3.5" />}
                  <span>{calendarMode ? 'Week' : 'Maand'}</span>
                </button>
              </div>

              <div className="relative">
                {/* Week strip */}
                <div className={`transition-all duration-300 ${calendarMode ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                  <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {dates.map((d, i) => {
                      const isSelected = selectedDayIndex === i;
                      return (
                        <button
                          key={i}
                          data-day={i}
                          onClick={() => handleDateSelect(i)}
                          className={`flex flex-col items-center min-w-[48px] py-2 px-1.5 rounded-2xl transition-all duration-200 text-center ${
                            isSelected
                              ? 'bg-gray-800 text-white shadow-md'
                              : 'bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                          style={!isSelected ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                        >
                          <span className="text-[10px] uppercase font-medium opacity-70">{DAY_NAMES[d.getDay()]}</span>
                          <span className="text-base font-bold">{d.getDate()}</span>
                          <span className="text-[10px] opacity-70">{MONTH_NAMES[d.getMonth()]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inline month calendar */}
                <div className={`transition-all duration-300 ${calendarMode ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                  {(() => {
                    const cells = buildMonthGrid(viewMonth);
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                          </button>
                          <span className="text-sm font-semibold text-gray-700 capitalize">
                            {MONTH_NAMES_FULL[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                          </span>
                          <button
                            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {DAY_NAMES_SHORT.map(dn => (
                            <div key={dn} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{dn}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {cells.map((cell, idx) => {
                            if (!cell.inMonth) return <div key={`e-${idx}`} className="h-10" />;
                            const isSelected = selectedDayIndex === cell.dayIndex;
                            return (
                              <button
                                key={idx}
                                disabled={cell.disabled}
                                onClick={() => !cell.disabled && handleCalendarDayClick(cell.date)}
                                className={`h-10 w-full rounded-2xl text-sm font-semibold flex flex-col items-center justify-center transition-all duration-200 ${
                                  cell.disabled
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-gray-800 text-white shadow-md'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <span>{cell.date.getDate()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Gasten</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPartySize(Math.max(minParty, data.party_size - 1))}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <span className="text-lg font-bold w-5 text-center tabular-nums">{data.party_size}</span>
                <button
                  onClick={() => setPartySize(Math.min(maxParty, data.party_size + 1))}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Time */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tijd</span>
              </div>
              {availabilityLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : flatSlots.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Geen tijden beschikbaar</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {flatSlots.map(({ slot, shift }) => {
                    const isUnavailable = !slot.available;
                    const isSelected = data.selectedSlot?.time === slot.time && data.selectedSlot?.ticket_id === slot.ticket_id;
                    const availability = getSlotAvailability(slot);
                    return (
                      <button
                        key={`${slot.time}-${slot.ticket_id}`}
                        onClick={() => !isUnavailable && handleTimeSelect({ slot, shift })}
                        disabled={isUnavailable}
                        className={`flex flex-col items-center rounded-xl text-sm font-semibold py-2.5 transition-all duration-200 ${
                          isUnavailable
                            ? 'bg-gray-100 text-gray-300 line-through cursor-not-allowed'
                            : isSelected
                            ? 'bg-gray-800 text-white shadow-md'
                            : availability === 'low'
                            ? 'bg-red-50 text-gray-700 hover:bg-red-100'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                        style={!isSelected && !isUnavailable ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                      >
                        <span>{slot.time}</span>
                        {!isUnavailable && availability === 'medium' && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white/50' : 'bg-amber-400'}`} />
                        )}
                        {!isUnavailable && availability === 'low' && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white/50' : 'bg-red-400'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      {tickets.length > 0 && (
        <>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kies je ervaring</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Tickets */}
          <div className="space-y-3">
            {tickets.map(ticket => {
              const available = isTicketAvailable(ticket);
              const isSelected = data.selectedTicket?.id === ticket.id;
              const hasImage = !!ticket.image_url;
              return (
                <button
                  key={ticket.id}
                  onClick={() => handleTicketSelect(ticket)}
                  className={`w-full text-left rounded-3xl overflow-hidden transition-all duration-300 ${
                    !available ? 'opacity-40 grayscale-[30%]' : ''
                  }`}
                  style={{
                    boxShadow: isSelected
                      ? '0 0 0 2px #1a1a1a, 0 8px 20px rgba(0,0,0,0.1)'
                      : '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                  }}
                >
                  {hasImage ? (
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.4/1' }}>
                      <img src={ticket.image_url!} alt={ticket.name} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <span className="text-white font-semibold text-sm">{ticket.display_title || ticket.name}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 text-gray-800" />
                        </div>
                      )}
                      {!available && (
                        <div className="absolute top-3 left-4">
                          <span className="text-white text-[11px] font-medium bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            Niet beschikbaar
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900" style={{ aspectRatio: '2.4/1' }}>
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <span className="text-white font-semibold text-sm">{ticket.display_title || ticket.name}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 text-gray-800" />
                        </div>
                      )}
                      {!available && (
                        <div className="absolute top-3 left-4">
                          <span className="text-white text-[11px] font-medium bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            Niet beschikbaar
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="px-4 py-3 bg-white">
                    {(ticket.description || ticket.short_description) && (
                      <p className="text-sm text-gray-500 leading-relaxed">{ticket.short_description || ticket.description}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">{ticket.min_party_size}–{ticket.max_party_size} gasten</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
