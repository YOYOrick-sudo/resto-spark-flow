import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState } from 'react';
import { BookingProvider, useBooking } from '@/contexts/BookingContext';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { TicketSelectStep } from '@/components/booking/TicketSelectStep';
import { DateGuestsStep } from '@/components/booking/DateGuestsStep';
import { TimeTicketStep } from '@/components/booking/TimeTicketStep';
import { GuestDetailsStep } from '@/components/booking/GuestDetailsStep';
import { ConfirmationStep } from '@/components/booking/ConfirmationStep';
import { Loader2, X } from 'lucide-react';
import { getWidgetThemeTokens, WidgetThemeContext, type WidgetTheme } from '@/hooks/useWidgetTheme';

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

const getNameSize = (name: string) => {
  if (name.length < 15) return 'text-xl';
  if (name.length < 25) return 'text-lg';
  if (name.length < 35) return 'text-base';
  return 'text-sm';
};

function BookingWidgetInner({ isEmbed }: { isEmbed: boolean }) {
  const { config, configLoading, configError, step, totalSteps, effectiveStyle, bookingResult } = useBooking();
  const { mainRef, postMsg } = useEmbedMessaging(isEmbed);
  const [prevStep, setPrevStep] = useState(step);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Track step direction
  useEffect(() => {
    if (step !== prevStep) {
      setDirection(step > prevStep ? 'forward' : 'back');
      setPrevStep(step);
    }
  }, [step, prevStep]);

  const confirmationStep = totalSteps;

  // Send nesto:booked when reaching confirmation step
  useEffect(() => {
    if (isEmbed && step === confirmationStep && bookingResult?.reservation_id) {
      postMsg('nesto:booked', { reservation_id: bookingResult.reservation_id });
    }
  }, [isEmbed, step, confirmationStep, bookingResult, postMsg]);

  const handleClose = useCallback(() => {
    window.parent.postMessage({ type: 'nesto:close' }, '*');
  }, []);

  if (configLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="h-full flex items-center justify-center px-6 bg-white">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">Niet beschikbaar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {configError || 'Deze widget is niet actief.'}
          </p>
        </div>
      </div>
    );
  }

  // Determine which step components to render based on effective style
  const renderStep = () => {
    if (effectiveStyle === 'showcase') {
      switch (step) {
        case 1: return <TicketSelectStep />;
        case 2: return <DateGuestsStep />;
        case 3: return <TimeTicketStep />;
        case 4: return <GuestDetailsStep />;
        case 5: return <ConfirmationStep />;
        default: return null;
      }
    }
    // Quick: 1=Date+Guests, 2=Time, 3=Details, 4=Confirmation
    switch (step) {
      case 1: return <DateGuestsStep />;
      case 2: return <TimeTicketStep />;
      case 3: return <GuestDetailsStep />;
      case 4: return <ConfirmationStep />;
      default: return null;
    }
  };

  const isConfirmation = step === confirmationStep;
  const animClass = direction === 'forward' ? 'animate-step-forward' : 'animate-step-back';

  // Get theme from URL
  const [params] = useSearchParams();
  const themeName = (params.get('theme') as WidgetTheme) || 'soft';
  const themeTokens = getWidgetThemeTokens(themeName);

  return (
    <WidgetThemeContext.Provider value={themeTokens}>
    <div ref={mainRef} className={`h-full flex flex-col ${themeTokens.bgClass}`} style={themeTokens.bgStyle}>
      {/* Panel header */}
      {isEmbed && (
        <header className="shrink-0 relative flex flex-col items-center gap-2 px-5 pt-4 pb-1">
          <button
            onClick={handleClose}
            className="absolute top-4 right-5 w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
          {config.logo_url && (
            <img
              src={config.logo_url}
              alt={config.location_name ?? 'Restaurant'}
              className="h-20 object-contain"
            />
          )}
        </header>
      )}

      {/* Standalone header (not embed) */}
      {!isEmbed && (
        <header className="shrink-0 px-5 pt-6 pb-2 flex flex-col items-center gap-3">
          {config.logo_url && (
            <img
              src={config.logo_url}
              alt={config.location_name ?? 'Restaurant'}
              className="h-20 object-contain"
            />
          )}
        </header>
      )}

      {/* Progress dots */}
      {!isConfirmation && <BookingProgress />}

      {/* Content with step transition */}
      <div className="flex-1 overflow-y-auto">
        <div key={step} className={`pb-6 ${animClass}`}>
          {renderStep()}
        </div>
      </div>

      {/* Restaurant name footer */}
      {config.location_name && (
        <footer className="shrink-0 px-5 pb-3 pt-2 text-center">
          <p className={`font-extrabold text-gray-400 tracking-normal ${getNameSize(config.location_name)}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {config.location_name}
          </p>
          {config.show_nesto_branding && (
            <span className="text-[10px] text-gray-300">Powered by Nesto</span>
          )}
        </footer>
      )}
    </div>
    </WidgetThemeContext.Provider>
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
      <div className={isEmbed ? 'h-screen' : 'min-h-screen bg-gray-50 flex justify-center'}>
        <div className={isEmbed ? 'h-full' : 'w-full max-w-md'}>
          <BookingWidgetInner isEmbed={isEmbed} />
        </div>
      </div>
    </BookingProvider>
  );
}
