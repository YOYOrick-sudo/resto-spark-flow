import { useEffect } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';

export function TimeTicketStep() {
  const {
    config, data, setStep, setSelectedSlot,
    availableShifts, availabilityLoading, loadAvailability,
  } = useBooking();

  const primaryColor = config?.primary_color ?? '#10B981';

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

  const isSelected = (slot: typeof allSlots[0]) =>
    data.selectedSlot?.time === slot.time &&
    data.selectedSlot?.ticket_id === slot.ticket_id;

  return (
    <div className="flex flex-col gap-4 px-4">
      {/* Back + summary */}
      <button
        type="button"
        onClick={() => setStep(1)}
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

      {/* Loading */}
      {availabilityLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
        </div>
      )}

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
            onClick={() => setStep(1)}
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

        return (
          <div key={shift.shift_id} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {shift.shift_name}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {available.map(slot => {
                const selected = data.selectedSlot?.time === slot.time && data.selectedSlot?.ticket_id === slot.ticket_id;
                return (
                  <button
                    key={`${slot.time}-${slot.ticket_id}`}
                    type="button"
                    onClick={() => setSelectedSlot(slot, shift)}
                    className="flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      borderColor: selected ? primaryColor : '#e5e7eb',
                      backgroundColor: selected ? primaryColor : '#fff',
                      color: selected ? '#fff' : '#374151',
                      boxShadow: selected ? `0 0 0 1px ${primaryColor}` : 'none',
                    }}
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {slot.time}
                    </span>
                    {slot.slot_type === 'squeeze' && (
                      <span className="text-[10px] opacity-70">kortere zittijd</span>
                    )}
                    {config?.show_end_time && (
                      <span className="text-[10px] opacity-60">
                        {computeEndTime(slot.time, slot.duration_minutes)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Multiple ticket types */}
      {!availabilityLoading && allSlots.length > 0 && (
        <div className="text-xs text-gray-400 text-center">
          {data.selectedSlot && (
            <span>
              {data.selectedSlot.ticket_name} · {data.selectedSlot.duration_minutes} min
            </span>
          )}
        </div>
      )}

      {/* Continue button */}
      <button
        type="button"
        disabled={!data.selectedSlot}
        onClick={() => setStep(3)}
        className="w-full py-3 rounded-xl text-white font-medium text-sm transition-opacity disabled:opacity-40"
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
