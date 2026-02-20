import { useEffect } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function SlotGridSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-24 rounded" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function TimeTicketStep() {
  const {
    config, data, goToStep, goBack, setSelectedSlot,
    availableShifts, availabilityLoading, loadAvailability,
    effectiveStyle,
  } = useBooking();

  const primaryColor = config?.primary_color ?? '#10B981';
  const accentColor = config?.accent_color ?? '#14B8A6';

  // Load slots when entering this step
  useEffect(() => {
    if (data.date && data.party_size > 0) {
      loadAvailability(data.date, data.party_size);
    }
  }, [data.date, data.party_size, loadAvailability]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const allSlots = availableShifts.flatMap(shift =>
    shift.slots
      .filter(s => s.available)
      .map(s => ({ ...s, shift }))
  );

  const handleSlotKeyDown = (e: React.KeyboardEvent, slot: any, shift: any) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedSlot(slot, shift);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-5">
      {/* Back + summary */}
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 self-start"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug
      </button>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          {data.date && formatDate(data.date)} · {data.party_size} {data.party_size === 1 ? 'gast' : 'gasten'}
        </p>
      </div>

      {/* Ticket info banner in showcase mode */}
      {effectiveStyle === 'showcase' && data.selectedTicket && (
        <div className="text-center">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
          >
            {data.selectedTicket.display_title}
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {availabilityLoading && <SlotGridSkeleton />}

      {/* No slots available */}
      {!availabilityLoading && allSlots.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">
            {config?.unavailable_text === 'walk_in_only'
              ? 'Alleen walk-ins vandaag. Kom langs!'
              : config?.unavailable_text === 'bel_ons'
              ? 'Bel ons om te reserveren.'
              : 'Geen beschikbare tijden voor deze datum.'}
          </p>
          <button
            type="button"
            onClick={goBack}
            className="mt-3 text-sm font-medium hover:underline"
            style={{ color: primaryColor }}
          >
            Kies een andere datum
          </button>
        </div>
      )}

      {/* Slots grouped by shift */}
      {!availabilityLoading && availableShifts.map(shift => {
        const available = shift.slots.filter(s => s.available);
        if (available.length === 0) return null;

        const normalAvailableCount = shift.slots.filter(
          s => s.available && s.slot_type !== 'squeeze'
        ).length;
        const showScarcity = normalAvailableCount <= 3;

        return (
          <div key={shift.shift_id} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {shift.shift_name}
            </h3>
            <div className="grid grid-cols-3 gap-2" role="listbox" aria-label={`Tijdslots ${shift.shift_name}`}>
              {available.map(slot => {
                const selected = data.selectedSlot?.time === slot.time && data.selectedSlot?.ticket_id === slot.ticket_id;
                const isSqueeze = slot.slot_type === 'squeeze';
                return (
                  <button
                    key={`${slot.time}-${slot.ticket_id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={0}
                    onClick={() => setSelectedSlot(slot, shift)}
                    onKeyDown={(e) => handleSlotKeyDown(e, slot, shift)}
                    className="flex flex-col items-center gap-0.5 h-11 justify-center rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{
                      border: `1px solid ${selected ? primaryColor : isSqueeze ? accentColor : '#e5e7eb'}`,
                      backgroundColor: selected ? primaryColor : '#fff',
                      color: selected ? '#fff' : '#374151',
                      boxShadow: selected ? `0 4px 12px -2px rgba(0,0,0,0.08)` : 'none',
                      transform: selected ? 'scale(1.05)' : 'scale(1)',
                      // @ts-ignore
                      '--tw-ring-color': primaryColor,
                    }}
                  >
                    <span>{slot.time}</span>
                    {showScarcity && !isSqueeze && (
                      <span
                        className="text-[10px] font-medium leading-none"
                        style={{ color: selected ? 'rgba(255,255,255,0.8)' : '#ea580c' }}
                      >
                        Nog {normalAvailableCount} {normalAvailableCount === 1 ? 'plek' : 'plekken'}
                      </span>
                    )}
                    {isSqueeze && (
                      <span
                        className="text-[10px] leading-none"
                        style={{ color: selected ? 'rgba(255,255,255,0.7)' : accentColor }}
                      >
                        kortere zittijd
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* End time + selected info */}
      {!availabilityLoading && allSlots.length > 0 && data.selectedSlot && (
        <div className="text-xs text-gray-400 text-center">
          {data.selectedSlot.ticket_name} · {data.selectedSlot.duration_minutes} min
          {config?.show_end_time && (
            <span> → {computeEndTime(data.selectedSlot.time, data.selectedSlot.duration_minutes)}</span>
          )}
        </div>
      )}

      {/* Continue button */}
      <button
        type="button"
        disabled={!data.selectedSlot}
        onClick={() => goToStep('details')}
        className="w-full h-12 rounded-[10px] text-white font-medium text-sm transition-all duration-150 disabled:opacity-40 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
        style={{ backgroundColor: primaryColor }}
      >
        Vul je gegevens in
      </button>
    </div>
  );
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
