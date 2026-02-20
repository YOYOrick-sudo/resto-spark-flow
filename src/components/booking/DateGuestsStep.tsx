import { useEffect, useMemo, useState } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { Calendar } from '@/components/ui/calendar';
import { Minus, Plus, Users, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { nl } from 'date-fns/locale';

function CalendarSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-3 w-full max-w-[280px]">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded" />
        ))}
      </div>
      {/* 5 weeks x 7 days */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <Skeleton key={col} className="h-9 w-9 rounded-lg mx-auto" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DateGuestsStep() {
  const {
    config, data, setDate, setPartySize,
    availableDates, availableDatesLoading,
    loadAvailableDates, goToStep, goBack,
    effectiveStyle,
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
    if (!availableDatesLoading && availableDates.length > 0 && !availableDateSet.has(dateStr)) {
      return true;
    }
    return false;
  };

  const canContinue = !!data.date && data.party_size > 0;
  const showBack = effectiveStyle === 'showcase';

  return (
    <div className="flex flex-col gap-6 px-5">
      {/* Back button (showcase mode only) */}
      {showBack && (
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug
        </button>
      )}

      {/* Welcome text */}
      {config?.welcome_text && (
        <p className="text-sm text-gray-500 text-center line-clamp-2">{config.welcome_text}</p>
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
            onClick={() => setPartySize(Math.max(config?.min_party_size ?? 1, data.party_size - 1))}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
            disabled={data.party_size <= (config?.min_party_size ?? 1)}
            aria-label="Minder gasten"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold w-8 text-center">{data.party_size}</span>
            <span className="text-sm text-gray-400">gasten</span>
          </div>
          <button
            type="button"
            onClick={() => setPartySize(Math.min(config?.max_party_size ?? 20, data.party_size + 1))}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30"
            disabled={data.party_size >= (config?.max_party_size ?? 20)}
            aria-label="Meer gasten"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex flex-col items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Kies een datum</label>
        <div aria-live="polite" className="text-xs text-gray-400">
          {availableDatesLoading && 'Beschikbaarheid laden...'}
        </div>
        {availableDatesLoading ? (
          <CalendarSkeleton />
        ) : (
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={handleDaySelect}
            onMonthChange={setCalendarMonth}
            disabled={disabledMatcher}
            locale={nl}
            weekStartsOn={1}
            className="rounded-lg border border-gray-200"
            modifiersStyles={{
              selected: { backgroundColor: primaryColor, color: '#fff', borderRadius: '8px', transition: 'transform 150ms ease', transform: 'scale(1)' },
              today: { outline: `2px solid ${primaryColor}`, outlineOffset: '-2px', borderRadius: '8px' },
            }}
          />
        )}
      </div>

      {/* Continue button */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => goToStep('time')}
        className="w-full h-12 rounded-[10px] text-white font-medium text-sm transition-all duration-150 disabled:opacity-40 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
        style={{ backgroundColor: primaryColor }}
      >
        Kies een tijd
      </button>
    </div>
  );
}
