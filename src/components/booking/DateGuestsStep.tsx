import { useEffect, useMemo, useState } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { Calendar } from '@/components/ui/calendar';
import { Minus, Plus, Users } from 'lucide-react';

export function DateGuestsStep() {
  const {
    config, data, setDate, setPartySize,
    availableDates, availableDatesLoading,
    loadAvailableDates, setStep,
  } = useBooking();

  const primaryColor = config?.primary_color ?? '#10B981';
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Load available dates when month changes
  useEffect(() => {
    if (!config) return;
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    loadAvailableDates(year, month, data.party_size);
  }, [calendarMonth, data.party_size, config, loadAvailableDates]);

  // Convert available dates to Date objects for the calendar
  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  const selectedDay = data.date ? new Date(data.date + 'T00:00:00') : undefined;

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    if (availableDateSet.has(dateStr)) {
      setDate(dateStr);
    }
  };

  // Disable dates that are not available or in the past
  const disabledMatcher = (day: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (day < today) return true;
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    // If dates are loaded and this date is NOT in the list, disable it
    if (!availableDatesLoading && availableDates.length > 0 && !availableDateSet.has(dateStr)) {
      return true;
    }
    return false;
  };

  const canContinue = !!data.date && data.party_size > 0;

  return (
    <div className="flex flex-col gap-6 px-4">
      {/* Welcome text */}
      {config?.welcome_text && (
        <p className="text-sm text-gray-600 text-center">{config.welcome_text}</p>
      )}

      {/* Party size selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Aantal gasten
        </label>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPartySize(Math.max(1, data.party_size - 1))}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
            disabled={data.party_size <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-2xl font-semibold w-12 text-center">{data.party_size}</span>
          <button
            type="button"
            onClick={() => setPartySize(Math.min(20, data.party_size + 1))}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
            disabled={data.party_size >= 20}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex flex-col items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Kies een datum</label>
        {availableDatesLoading && (
          <div className="text-xs text-gray-400">Beschikbaarheid laden...</div>
        )}
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={handleDaySelect}
          onMonthChange={setCalendarMonth}
          disabled={disabledMatcher}
          className="rounded-xl border border-gray-200"
          modifiersStyles={{
            selected: { backgroundColor: primaryColor, color: '#fff' },
          }}
        />
      </div>

      {/* Continue button */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => setStep(2)}
        className="w-full py-3 rounded-xl text-white font-medium text-sm transition-opacity disabled:opacity-40"
        style={{ backgroundColor: primaryColor }}
      >
        Kies een tijd
      </button>
    </div>
  );
}
