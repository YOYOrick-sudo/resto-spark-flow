import { useBooking } from '@/contexts/BookingContext';
import { Calendar, ExternalLink } from 'lucide-react';

export function ConfirmationStep() {
  const { config, data, bookingResult } = useBooking();
  const primaryColor = config?.primary_color ?? '#10B981';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Google Calendar link
  const calendarUrl = (() => {
    if (!data.date || !data.selectedSlot) return null;
    const start = new Date(`${data.date}T${data.selectedSlot.time}:00`);
    const end = new Date(start.getTime() + data.selectedSlot.duration_minutes * 60_000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`Reservering ${config?.location_name ?? 'Restaurant'}`);
    const details = encodeURIComponent(`${data.party_size} gasten · ${data.selectedSlot.ticket_name}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
  })();

  const manageUrl = bookingResult?.manage_token
    ? `${window.location.origin}/manage/${bookingResult.manage_token}`
    : null;

  return (
    <div className="flex flex-col items-center gap-6 px-5 py-4">
      {/* Animated checkmark */}
      <div className="w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke={primaryColor}
            strokeWidth="3"
            style={{
              strokeDasharray: 176,
              strokeDashoffset: 176,
              animation: 'check-circle 500ms ease-out forwards',
            }}
          />
          <circle
            cx="32" cy="32" r="28"
            fill={primaryColor}
            className="opacity-0"
            style={{
              animation: 'check-fill 300ms ease-out 400ms forwards',
            }}
          />
          <path
            d="M20 33 L28 41 L44 25"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 40,
              strokeDashoffset: 40,
              animation: 'check-mark 300ms ease-out 600ms forwards',
            }}
          />
        </svg>
        <style>{`
          @keyframes check-circle {
            to { stroke-dashoffset: 0; }
          }
          @keyframes check-fill {
            to { opacity: 1; }
          }
          @keyframes check-mark {
            to { stroke-dashoffset: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes check-circle {
              from, to { stroke-dashoffset: 0; }
            }
            @keyframes check-fill {
              from, to { opacity: 1; }
            }
            @keyframes check-mark {
              from, to { stroke-dashoffset: 0; }
            }
          }
        `}</style>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Reservering bevestigd!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Je ontvangt een bevestiging per e-mail.
        </p>
      </div>

      {/* Summary */}
      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
        {data.date && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Datum</span>
            <span className="font-medium text-gray-900">{formatDate(data.date)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tijd</span>
          <span className="font-medium text-gray-900">{data.selectedSlot?.time}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Gasten</span>
          <span className="font-medium text-gray-900">{data.party_size}</span>
        </div>
        {data.selectedSlot && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900">{data.selectedSlot.ticket_name}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col gap-2">
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-[10px] text-sm font-medium border border-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all duration-150 text-gray-700 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar className="h-4 w-4" />
            Voeg toe aan agenda
          </a>
        )}

        {manageUrl && (
          <a
            href={manageUrl}
            className="w-full h-11 rounded-[10px] text-sm font-medium border flex items-center justify-center gap-2 transition-all duration-150 text-white hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            <ExternalLink className="h-4 w-4" />
            Reservering beheren
          </a>
        )}

        {config?.success_redirect_url && (
          <a
            href={config.success_redirect_url}
            className="text-sm text-gray-500 hover:text-gray-700 text-center mt-1"
          >
            Terug naar website →
          </a>
        )}
      </div>
    </div>
  );
}
