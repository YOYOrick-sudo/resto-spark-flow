import { useEffect, useRef, useState, useCallback } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { Calendar, ExternalLink, Check, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type PaymentState = 'checking' | 'paid' | 'pending' | 'failed' | 'timeout';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">{label}</span>
      <span className="text-[15px] font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export function ConfirmationStep() {
  const { config, data, guestData, bookingResult, setStep, setDate, setPartySize, setSelectedSlot, setSelectedTicket, setGuestData } = useBooking();

  const [paymentState, setPaymentState] = useState<PaymentState>(
    bookingResult?.requires_payment ? 'checking' : 'paid'
  );
  const pollCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Poll payment status
  useEffect(() => {
    if (!bookingResult?.requires_payment || !bookingResult.manage_token) return;

    const poll = async () => {
      pollCount.current++;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api?action=manage&token=${bookingResult.manage_token}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const status = json.reservation?.payment_status;

        if (status === 'paid' || status === 'deposit_paid') {
          setPaymentState('paid');
          stopPolling();
        } else if (status === 'expired' || status === 'failed' || status === 'canceled') {
          setPaymentState('failed');
          stopPolling();
        } else {
          setPaymentState('pending');
        }
      } catch {
        // continue polling
      }

      if (pollCount.current >= 20) {
        setPaymentState('timeout');
        stopPolling();
      }
    };

    poll(); // immediate first check
    intervalRef.current = setInterval(poll, 3000);

    return stopPolling;
  }, [bookingResult?.requires_payment, bookingResult?.manage_token, stopPolling]);

  const handleRetryPayment = async () => {
    if (!bookingResult?.reservation_id) return;
    setPaymentState('checking');
    try {
      const { data: paymentData, error } = await supabase.functions.invoke('mollie-create-payment', {
        body: { reservation_id: bookingResult.reservation_id },
      });
      if (error) throw error;
      if (paymentData?.checkout_url) {
        window.location.href = paymentData.checkout_url;
      }
    } catch {
      setPaymentState('failed');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const calendarUrl = (() => {
    if (!data.date || !data.selectedSlot) return null;
    const start = new Date(`${data.date}T${data.selectedSlot.time}:00`);
    const end = new Date(start.getTime() + data.selectedSlot.duration_minutes * 60_000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`Reservering ${config?.location_name ?? 'Restaurant'}`);
    const details = encodeURIComponent(`${data.party_size} gasten · ${data.selectedSlot.ticket_name}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
  })();

  // Always use current origin so preview stays in preview
  const manageUrl = bookingResult?.manage_token
    ? `${window.location.origin}/manage/${bookingResult.manage_token}`
    : null;

  const handleRebook = () => {
    setDate(null);
    setPartySize(2);
    setSelectedSlot(null, null);
    setSelectedTicket(null);
    setGuestData({ first_name: '', last_name: '', email: '', phone: '', guest_notes: '', booking_answers: [], honeypot: '', marketing_optin: false });
    setStep(1);
  };

  // Payment pending/checking states
  if (paymentState === 'checking' || paymentState === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 px-5">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-gray-500 text-center">Betaling wordt verwerkt...</p>
      </div>
    );
  }

  if (paymentState === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 px-5">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-gray-800">Betaling mislukt</h3>
          <p className="text-sm text-gray-500">De betaling is niet gelukt. Probeer het opnieuw.</p>
        </div>
        <button
          onClick={handleRetryPayment}
          className="h-11 rounded-[10px] px-6 text-sm font-medium bg-primary text-primary-foreground flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          Opnieuw betalen
        </button>
      </div>
    );
  }

  if (paymentState === 'timeout') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 px-5">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-600" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-gray-800">Even geduld</h3>
          <p className="text-sm text-gray-500">We wachten nog op de bevestiging van je betaling. Controleer je e-mail voor updates.</p>
        </div>
      </div>
    );
  }

  // paymentState === 'paid' — normal confirmation
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6 px-5">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ animation: 'checkPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', backgroundColor: 'color-mix(in srgb, var(--widget-primary) 12%, transparent)' }}
      >
        <Check className="w-11 h-11" style={{ color: 'var(--widget-primary)' }} />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Bevestigd</h3>
        <p className="text-sm text-gray-500">Je reservering is geplaatst. Je ontvangt een bevestiging per e-mail.</p>
      </div>

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
      </div>

      <div className="w-full flex flex-col gap-2.5">
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-2xl text-sm font-medium border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all duration-200 text-gray-700 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar className="h-4 w-4" style={{ color: 'var(--widget-primary)' }} />
            Voeg toe aan agenda
          </a>
        )}

        {manageUrl && (
          <a
            href={manageUrl}
            className="w-full h-12 rounded-2xl text-sm font-medium border border-gray-200 flex items-center justify-center gap-2 transition-all duration-200 text-gray-700 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <ExternalLink className="h-4 w-4" style={{ color: 'var(--widget-primary)' }} />
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
