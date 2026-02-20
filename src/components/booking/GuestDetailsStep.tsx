import { useState, useCallback } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { User, Mail, Phone, Loader2 } from 'lucide-react';

function IconInput({ icon, label, value, onChange, type = 'text', onBlur }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; type?: string; onBlur?: () => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={label}
        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
      />
    </div>
  );
}

export function GuestDetailsStep() {
  const {
    config, guestData, setGuestData,
    submitBooking, bookingLoading, bookingError,
  } = useBooking();

  const [lookupDone, setLookupDone] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState<string | null>(null);

  // Guest lookup on email blur
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

  // Handle booking question answers
  const updateAnswer = (questionId: string, values: string[]) => {
    const existing = guestData.booking_answers.filter(a => a.question_id !== questionId);
    setGuestData({ booking_answers: [...existing, { question_id: questionId, values }] });
  };

  const getAnswer = (questionId: string): string[] => {
    return guestData.booking_answers.find(a => a.question_id === questionId)?.values ?? [];
  };

  const canSubmit = !!(guestData.first_name && guestData.last_name && guestData.email);

  return (
    <div className="flex flex-col gap-4 px-5">
      <h3 className="text-lg font-bold text-gray-800 text-center">Je gegevens</h3>

      {/* Welcome back */}
      {welcomeBack && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm text-center text-green-700">
          Welkom terug, {welcomeBack}! 🎉
        </div>
      )}

      {/* Form */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <IconInput
            icon={<User className="w-4 h-4" />}
            label="Voornaam"
            value={guestData.first_name}
            onChange={v => setGuestData({ first_name: v })}
          />
          <IconInput
            icon={<User className="w-4 h-4" />}
            label="Achternaam"
            value={guestData.last_name}
            onChange={v => setGuestData({ last_name: v })}
          />
        </div>
        <IconInput
          icon={<Mail className="w-4 h-4" />}
          label="E-mailadres"
          type="email"
          value={guestData.email}
          onChange={v => setGuestData({ email: v })}
          onBlur={handleEmailBlur}
        />
        <IconInput
          icon={<Phone className="w-4 h-4" />}
          label="Telefoonnummer"
          type="tel"
          value={guestData.phone}
          onChange={v => setGuestData({ phone: v })}
        />
        <textarea
          value={guestData.guest_notes}
          onChange={e => setGuestData({ guest_notes: e.target.value })}
          placeholder="Opmerkingen"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none transition-all placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
        />

        {/* Honeypot */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={guestData.honeypot}
          onChange={e => setGuestData({ honeypot: e.target.value })}
          className="absolute -left-[9999px] opacity-0 h-0 w-0"
          aria-hidden="true"
        />

        {/* Booking questions */}
        {config?.booking_questions?.map(q => (
          <div key={q.id}>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              {q.label} {q.required && '*'}
            </label>

            {q.type === 'text' && (
              <input
                type="text"
                value={getAnswer(q.id)[0] ?? ''}
                onChange={e => updateAnswer(q.id, [e.target.value])}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
              />
            )}

            {(q.type === 'single_select' || q.type === 'multi_select') && q.options && (
              <div className="flex flex-wrap gap-2">
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
                          const next = selected
                            ? currentValues.filter(v => v !== opt)
                            : [...currentValues, opt];
                          updateAnswer(q.id, next);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        selected
                          ? 'border-gray-800 bg-gray-800 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
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

      {/* Error */}
      {bookingError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 text-center">
          {bookingError}
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        disabled={!canSubmit || bookingLoading}
        onClick={submitBooking}
        className="w-full h-12 rounded-2xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {bookingLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Bezig met boeken...
          </>
        ) : (
          'Bevestigen'
        )}
      </button>
    </div>
  );
}
