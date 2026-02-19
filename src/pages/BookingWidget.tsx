import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';
import { BookingProvider, useBooking } from '@/contexts/BookingContext';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { DateGuestsStep } from '@/components/booking/DateGuestsStep';
import { TimeTicketStep } from '@/components/booking/TimeTicketStep';
import { GuestDetailsStep } from '@/components/booking/GuestDetailsStep';
import { ConfirmationStep } from '@/components/booking/ConfirmationStep';
import { Loader2 } from 'lucide-react';

function useEmbedMessaging(isEmbed: boolean) {
  const mainRef = useRef<HTMLDivElement>(null);

  const postMsg = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (!isEmbed) return;
    window.parent.postMessage({ type, ...payload }, '*');
  }, [isEmbed]);

  // Continuous height tracking via ResizeObserver
  useEffect(() => {
    if (!isEmbed || !mainRef.current) return;
    const el = mainRef.current;
    const sendHeight = () => postMsg('nesto:resize', { height: el.scrollHeight });
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isEmbed, postMsg]);

  return { mainRef, postMsg };
}

function BookingWidgetInner({ isEmbed }: { isEmbed: boolean }) {
  const { config, configLoading, configError, step, bookingResult } = useBooking();
  const { mainRef, postMsg } = useEmbedMessaging(isEmbed);

  // Send nesto:booked when reaching confirmation step
  useEffect(() => {
    if (isEmbed && step === 4 && bookingResult?.reservation_id) {
      postMsg('nesto:booked', { reservation_id: bookingResult.reservation_id });
    }
  }, [isEmbed, step, bookingResult, postMsg]);

  if (configLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isEmbed ? 'bg-transparent' : 'bg-gray-50'}`}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-6 ${isEmbed ? 'bg-transparent' : 'bg-gray-50'}`}>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">Niet beschikbaar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {configError || 'Deze widget is niet actief.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mainRef} className={`min-h-screen flex flex-col items-center ${isEmbed ? 'bg-transparent' : 'bg-gray-50'}`}>
      {/* Header - hidden in embed mode */}
      {!isEmbed && (
        <header className="w-full max-w-md px-4 pt-6 pb-2 flex flex-col items-center gap-3">
          {config.logo_url && (
            <img
              src={config.logo_url}
              alt={config.location_name ?? 'Restaurant'}
              className="h-12 object-contain"
            />
          )}
          {config.location_name && (
            <h1 className="text-lg font-semibold text-gray-900">{config.location_name}</h1>
          )}
        </header>
      )}

      {/* Card */}
      <main className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-8 overflow-hidden">
        {step < 4 && <BookingProgress />}

        <div className="pb-6">
          {step === 1 && <DateGuestsStep />}
          {step === 2 && <TimeTicketStep />}
          {step === 3 && <GuestDetailsStep />}
          {step === 4 && <ConfirmationStep />}
        </div>
      </main>

      {/* Powered by - hidden in embed mode */}
      {!isEmbed && config.show_nesto_branding && (
        <footer className="pb-6 text-center">
          <span className="text-xs text-gray-400">Powered by Nesto</span>
        </footer>
      )}
    </div>
  );
}

export default function BookingWidget() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get('embed') === 'true';

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Geen restaurant opgegeven.</p>
      </div>
    );
  }

  return (
    <BookingProvider slug={slug}>
      <BookingWidgetInner isEmbed={isEmbed} />
    </BookingProvider>
  );
}
