import { useBooking } from '@/contexts/BookingContext';
import { Calendar, ExternalLink, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

export function ConfirmationStep() {
  const { config, data, guestData, bookingResult, setStep, setDate, setPartySize, setSelectedSlot, setSelectedTicket, setGuestData } = useBooking();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
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

  const handleRebook = () => {
    setDate(null);
    setPartySize(2);
    setSelectedSlot(null, null);
    setSelectedTicket(null);
    setGuestData({ first_name: '', last_name: '', email: '', phone: '', guest_notes: '', booking_answers: [], honeypot: '' });
    setStep(1);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6 px-5">
      {/* Animated checkmark */}
      <div
        className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
        style={{ animation: 'checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        <Check className="w-10 h-10 text-green-600" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-800">Bevestigd!</h3>
        <p className="text-sm text-gray-500">Je reservering is geplaatst. Je ontvangt een bevestiging per e-mail.</p>
      </div>

      {/* Ticket-style summary card */}
      <div className="w-full bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="border-b-2 border-dashed border-gray-200 px-5 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold text-center">Reservering</p>
        </div>
        <div className="p-5 space-y-3">
          {data.selectedTicket && (
            <Row label="Ervaring" value={data.selectedTicket.display_title || data.selectedTicket.name} />
          )}
          {data.date && <Row label="Datum" value={formatDate(data.date)} />}
          {data.selectedSlot && <Row label="Tijd" value={data.selectedSlot.time} />}
          <Row label="Gasten" value={String(data.party_size)} />
          <Row label="Naam" value={`${guestData.first_name} ${guestData.last_name}`} />
        </div>
        {manageUrl && (
          <div className="border-t-2 border-dashed border-gray-200 px-5 py-4 flex flex-col items-center gap-2">
            <QRCodeSVG value={manageUrl} size={80} />
            <span className="text-[11px] text-gray-400">Scan om te beheren</span>
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
            className="w-full h-11 rounded-[10px] text-sm font-medium border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all duration-150 text-gray-700 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar className="h-4 w-4" />
            Voeg toe aan agenda
          </a>
        )}

        {manageUrl && (
          <a
            href={manageUrl}
            className="w-full h-11 rounded-[10px] text-sm font-medium border border-gray-200 flex items-center justify-center gap-2 transition-all duration-150 text-gray-700 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]"
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

      <button onClick={handleRebook} className="text-sm text-gray-500 underline">
        Opnieuw boeken
      </button>

      <style>{`
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes checkPop {
            from, to { transform: scale(1); opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
