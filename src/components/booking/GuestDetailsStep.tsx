import { useState, useCallback } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useWidgetTheme } from '@/hooks/useWidgetTheme';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function GuestDetailsStep() {
  const {
    config, data, guestData, setGuestData, goBack,
    submitBooking, bookingLoading, bookingError,
  } = useBooking();

  const t = useWidgetTheme();
  const primaryColor = config?.primary_color ?? '#10B981';
  const accentColor = config?.accent_color ?? '#14B8A6';
  const [lookupDone, setLookupDone] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handleEmailBlur = useCallback(async () => {
    if (!config || !guestData.email || lookupDone) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestData.email)) return;

    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api/guest-lookup`;
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ location_id: config.location_id, email: guestData.email }),
      });
      const result = await res.json();
      if (result.found && result.customer) {
        setGuestData({
          first_name: result.customer.first_name || guestData.first_name,
          last_name: result.customer.last_name || guestData.last_name,
          phone: result.customer.phone_number || guestData.phone,
        });
        setWelcomeBack(result.customer.first_name);
      }
      setLookupDone(true);
    } catch {
      // Silently fail
    }
  }, [config, guestData.email, lookupDone, guestData.first_name, guestData.last_name, guestData.phone, setGuestData]);

  const updateAnswer = (questionId: string, values: string[]) => {
    const existing = guestData.booking_answers.filter(a => a.question_id !== questionId);
    setGuestData({ booking_answers: [...existing, { question_id: questionId, values }] });
  };

  const getAnswer = (questionId: string): string[] => {
    return guestData.booking_answers.find(a => a.question_id === questionId)?.values ?? [];
  };

  const canSubmit = !!(guestData.first_name && guestData.last_name && guestData.email);

  const inputClass = `mt-1 w-full ${t.inputClass} focus:outline-none transition-all`;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.boxShadow = t.inputFocusRing(primaryColor);
    if (t.theme === 'soft') e.target.style.borderColor = primaryColor;
    if (t.theme === 'glass') e.target.style.borderColor = primaryColor;
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.boxShadow = 'none';
    e.target.style.borderColor = t.theme === 'glass' ? '#e5e7eb' : '#e5e7eb';
  };

  return (
    <div className="flex flex-col gap-4 px-5">
      <button type="button" onClick={goBack} className={t.backButtonClass}>
        <ArrowLeft className="h-4 w-4" />
        Terug
      </button>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          {data.date && formatDate(data.date)} · {data.selectedSlot?.time} · {data.party_size} {data.party_size === 1 ? 'gast' : 'gasten'}
        </p>
      </div>

      {welcomeBack && (
        <div
          className={`${t.bannerRadius} px-4 py-2 text-sm text-center`}
          style={{
            backgroundColor: `${accentColor}10`,
            borderColor: `${accentColor}30`,
            color: accentColor,
            border: `1px solid ${accentColor}30`,
          }}
        >
          Welkom terug, {welcomeBack}! 🎉
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700">E-mailadres *</label>
          <input
            type="email"
            required
            value={guestData.email}
            onChange={e => setGuestData({ email: e.target.value })}
            onBlur={(e) => { handleEmailBlur(); handleBlur(e); }}
            placeholder="je@email.nl"
            className={inputClass}
            onFocus={handleFocus}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Voornaam *</label>
            <input type="text" required value={guestData.first_name} onChange={e => setGuestData({ first_name: e.target.value })} placeholder="Voornaam" className={inputClass} onFocus={handleFocus} onBlur={handleBlur} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Achternaam *</label>
            <input type="text" required value={guestData.last_name} onChange={e => setGuestData({ last_name: e.target.value })} placeholder="Achternaam" className={inputClass} onFocus={handleFocus} onBlur={handleBlur} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Telefoon</label>
          <input type="tel" value={guestData.phone} onChange={e => setGuestData({ phone: e.target.value })} placeholder="+31 6 12345678" className={inputClass} onFocus={handleFocus} onBlur={handleBlur} />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Opmerkingen</label>
          <textarea
            value={guestData.guest_notes}
            onChange={e => setGuestData({ guest_notes: e.target.value })}
            placeholder="Allergieën, speciale wensen..."
            rows={2}
            className={`${inputClass} resize-none`}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        {/* Honeypot */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={guestData.honeypot} onChange={e => setGuestData({ honeypot: e.target.value })} className="absolute -left-[9999px] opacity-0 h-0 w-0" aria-hidden="true" />

        {/* Booking questions */}
        {config?.booking_questions?.map(q => (
          <div key={q.id}>
            <label className="text-xs font-medium text-gray-700">
              {q.label} {q.required && '*'}
            </label>

            {q.type === 'text' && (
              <input type="text" value={getAnswer(q.id)[0] ?? ''} onChange={e => updateAnswer(q.id, [e.target.value])} className={inputClass} onFocus={handleFocus} onBlur={handleBlur} />
            )}

            {(q.type === 'single_select' || q.type === 'multi_select') && q.options && (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {q.options.map(opt => {
                  const currentValues = getAnswer(q.id);
                  const selected = currentValues.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (q.type === 'single_select') {
                          updateAnswer(q.id, [opt]);
                        } else {
                          const next = selected ? currentValues.filter(v => v !== opt) : [...currentValues, opt];
                          updateAnswer(q.id, next);
                        }
                      }}
                      className={`px-3 py-1.5 ${t.selectPillRadius} text-sm border transition-colors`}
                      style={{
                        borderColor: selected ? primaryColor : '#d1d5db',
                        backgroundColor: selected ? primaryColor : t.theme === 'glass' ? 'rgba(255,255,255,0.6)' : '#fff',
                        color: selected ? '#fff' : '#374151',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {bookingError && (
        <div className={`${t.bannerRadius} border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 text-center`}>
          {bookingError}
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit || bookingLoading}
        onClick={submitBooking}
        className={`w-full h-12 ${t.ctaRadius} text-white font-semibold text-sm transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 ${t.ctaHoverClass}`}
        style={{ backgroundColor: primaryColor, boxShadow: canSubmit ? t.ctaShadow(primaryColor) : 'none' }}
      >
        {bookingLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Bezig met boeken...
          </>
        ) : (
          'Reservering bevestigen'
        )}
      </button>
    </div>
  );
}
