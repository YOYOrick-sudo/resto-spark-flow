import { useEffect, useMemo, useState } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useWidgetTheme } from '@/hooks/useWidgetTheme';
import { Calendar } from '@/components/ui/calendar';
import { Minus, Plus, Users, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { nl } from 'date-fns/locale';

function CalendarSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-3 w-full max-w-[280px]">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded" />
        ))}
      </div>
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

  const t = useWidgetTheme();
  const primaryColor = config?.primary_color ?? '#10B981';
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (!config) return;
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    loadAvailableDates(year, month, data.party_size);
  }, [calendarMonth, data.party_size, config, loadAvailableDates]);

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
      {/* Back button */}
      {showBack && (
        <button type="button" onClick={goBack} className={t.backButtonClass}>
          <ArrowLeft className="h-4 w-4" />
          Terug
        </button>
      )}

      {config?.welcome_text && (
        <p className="text-sm text-gray-500 text-center line-clamp-2">{config.welcome_text}</p>
      )}

      {/* Party size selector */}
      <div className={`flex flex-col gap-2 ${t.partySizeContainerClass}`}>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Aantal gasten
        </label>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPartySize(Math.max(config?.min_party_size ?? 1, data.party_size - 1))}
            className={t.partySizeButtonClass}
            disabled={data.party_size <= (config?.min_party_size ?? 1)}
            aria-label="Minder gasten"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold w-10 text-center">{data.party_size}</span>
            <span className="text-sm text-gray-400">gasten</span>
          </div>
          <button
            type="button"
            onClick={() => setPartySize(Math.min(config?.max_party_size ?? 20, data.party_size + 1))}
            className={t.partySizeButtonClass}
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
            className={t.theme === 'glass' ? 'rounded-xl border border-white/40 bg-white/50 backdrop-blur-sm' : 'rounded-xl border border-gray-100 shadow-sm'}
            modifiersStyles={{
              selected: { backgroundColor: primaryColor, color: '#fff', borderRadius: t.calendarDayRadius, transition: 'transform 150ms ease', transform: 'scale(1)' },
              today: { outline: `2px solid ${primaryColor}`, outlineOffset: '-2px', borderRadius: t.calendarDayRadius },
            }}
          />
        )}
      </div>

      {/* Continue button */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => goToStep('time')}
        className={`w-full h-12 ${t.ctaRadius} text-white font-semibold text-sm transition-all duration-200 disabled:opacity-40 ${t.ctaHoverClass}`}
        style={{ backgroundColor: primaryColor, boxShadow: canContinue ? t.ctaShadow(primaryColor) : 'none' }}
      >
        Kies een tijd
      </button>
    </div>
  );
}
