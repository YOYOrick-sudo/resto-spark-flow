import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { BookingProvider, useBooking } from '@/contexts/BookingContext';
import { BookingProgress } from '@/components/booking/BookingProgress';
import { SelectionStep } from '@/components/booking/SelectionStep';
import { GuestDetailsStep } from '@/components/booking/GuestDetailsStep';
import { ConfirmationStep } from '@/components/booking/ConfirmationStep';
import { Loader2, X, ChevronLeft, ChevronDown, ChevronUp, Calendar as CalendarIcon, Users, Clock, Check, Pencil } from 'lucide-react';

function useEmbedMessaging(isEmbed: boolean) {
  const mainRef = useRef<HTMLDivElement>(null);

  const postMsg = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (!isEmbed) return;
    window.parent.postMessage({ type, ...payload }, '*');
  }, [isEmbed]);

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

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function BookingWidgetInner({ isEmbed }: { isEmbed: boolean }) {
  const { config, configLoading, configError, step, setStep, goBack, canGoNext, data, bookingResult, totalSteps } = useBooking();
  const { mainRef, postMsg } = useEmbedMessaging(isEmbed);
  const [fadeIn, setFadeIn] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [prevStep, setPrevStep] = useState(step);

  // Track step for fade animation
  useEffect(() => {
    if (step !== prevStep) {
      setFadeIn(false);
      const t = setTimeout(() => { setFadeIn(true); setPrevStep(step); }, 150);
      return () => clearTimeout(t);
    }
  }, [step, prevStep]);

  const isConfirmation = step === 3;

  // Send nesto:booked when reaching confirmation
  useEffect(() => {
    if (isEmbed && isConfirmation && bookingResult?.reservation_id) {
      postMsg('nesto:booked', { reservation_id: bookingResult.reservation_id });
    }
  }, [isEmbed, isConfirmation, bookingResult, postMsg]);

  const handleClose = useCallback(() => {
    window.parent.postMessage({ type: 'nesto:close' }, '*');
  }, []);

  // Navigate with fade
  const goTo = useCallback((s: 1 | 2 | 3) => {
    setFadeIn(false);
    setTimeout(() => { setStep(s); setFadeIn(true); }, 150);
  }, [setStep]);

  const next = useCallback(() => {
    if (canGoNext && step < 3) goTo((step + 1) as 1 | 2 | 3);
  }, [canGoNext, step, goTo]);

  const back = useCallback(() => {
    if (step > 1) goTo((step - 1) as 1 | 2 | 3);
  }, [step, goTo]);

  // Format summary line
  const summaryText = useMemo(() => {
    if (!data.date) return '—';
    const d = new Date(data.date + 'T00:00:00');
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} · ${data.party_size} gasten · ${data.selectedSlot?.time ?? '—'}`;
  }, [data.date, data.party_size, data.selectedSlot]);

  // Ambient background image
  const ambientImage = data.selectedTicket?.image_url;

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

  const renderStep = () => {
    switch (step) {
      case 1: return <SelectionStep />;
      case 2: return <GuestDetailsStep />;
      case 3: return <ConfirmationStep />;
      default: return null;
    }
  };

  return (
    <div ref={mainRef} className="h-full flex flex-col relative" style={{ backgroundColor: '#FAFAFA', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Ambient background */}
      {ambientImage && !isConfirmation && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={ambientImage}
            alt=""
            className="w-full h-full object-cover transition-all duration-700 ease-out"
            style={{ filter: 'blur(40px)', opacity: 0.08, transform: 'scale(1.2)' }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative flex-1 min-h-0 z-10">
        <div
          className="h-full overflow-y-auto pb-4 transition-opacity duration-150"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          {/* Header */}
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

          {!isEmbed && (
            <header className="shrink-0 pt-10 pb-2 flex flex-col items-center gap-3">
              {config.logo_url && (
                <img
                  src={config.logo_url}
                  alt={config.location_name ?? 'Restaurant'}
                  className="h-20 object-contain"
                />
              )}
            </header>
          )}

          {/* Progress bars */}
          {!isConfirmation && <BookingProgress />}

          {/* Step content */}
          {renderStep()}
        </div>

        {/* Bottom gradient */}
        {!isConfirmation && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#FAFAFA] to-transparent z-10" />
        )}
      </div>

      {/* CTA bar — steps 1 only (step 2 has its own submit button) */}
      {step === 1 && (
        <div className="shrink-0 px-5 pb-4 pt-2 relative z-10">
          <button
            onClick={next}
            disabled={!canGoNext}
            className="w-full h-12 rounded-[10px] text-sm font-semibold transition-all duration-200 disabled:opacity-40 text-white"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            Volgende (1/2)
          </button>
        </div>
      )}

      {/* Summary dropdown + CTA for step 2 is handled inside GuestDetailsStep */}
      {step === 2 && (
        <div className="shrink-0 px-5 pb-4 pt-2 space-y-2 relative z-10">
          {/* Summary dropdown */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => setSummaryOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {summaryOpen ? (
                <>
                  <span className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Je selectie</span>
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </>
              ) : (
                <>
                  <span className="truncate">{summaryText}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                </>
              )}
            </button>
            {summaryOpen && (
              <div className="border-t border-gray-100">
                {[
                  { icon: <CalendarIcon className="w-4 h-4" />, label: 'Datum', value: data.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) : '—' },
                  { icon: <Users className="w-4 h-4" />, label: 'Gasten', value: `${data.party_size} gasten` },
                  { icon: <Clock className="w-4 h-4" />, label: 'Tijd', value: data.selectedSlot?.time ?? '—' },
                  { icon: <Check className="w-4 h-4" />, label: 'Ervaring', value: data.selectedTicket?.display_title || data.selectedTicket?.name || '—' },
                ].map(row => (
                  <button
                    key={row.label}
                    onClick={() => goTo(1)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-gray-400">{row.icon}</span>
                    <span className="text-xs text-gray-400 w-16 text-left">{row.label}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800 text-left">{row.value}</span>
                    <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Back button */}
          <div className="flex gap-3">
            <button onClick={back} className="h-12 w-12 rounded-[10px] bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1" />
          </div>
        </div>
      )}

      {/* Footer */}
      {config.location_name && (
        <footer className="shrink-0 pb-8 pt-1 text-center relative z-10">
          <p className={`font-extrabold text-gray-400 tracking-normal ${getNameSize(config.location_name)}`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {config.location_name}
          </p>
          {config.show_nesto_branding && (
            <span className="text-[10px] text-gray-300">Powered by Nesto</span>
          )}
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
      <div className={isEmbed ? 'h-screen' : 'min-h-screen bg-gray-50 flex justify-center'}>
        <div className={isEmbed ? 'h-full' : 'w-full max-w-md'}>
          <BookingWidgetInner isEmbed={isEmbed} />
        </div>
      </div>
    </BookingProvider>
  );
}
