import { useState } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { Check, ArrowLeft } from 'lucide-react';

const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

interface WaitlistFormProps {
  onBack: () => void;
}

export function WaitlistForm({ onBack }: WaitlistFormProps) {
  const { config, data } = useBooking();

  const [timePreference, setTimePreference] = useState<'any' | 'range'>('any');
  const [timeFrom, setTimeFrom] = useState('17:00');
  const [timeTo, setTimeTo] = useState('21:00');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateObj = data.date ? new Date(data.date + 'T00:00:00') : null;

  const handleSubmit = async () => {
    if (!firstName || !lastName || !email || !config || !data.date) return;
    if (honeypot) return; // bot trap

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api/waitlist`;
      const body: Record<string, unknown> = {
        location_id: config.location_id,
        date: data.date,
        party_size: data.party_size,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || undefined,
        notes: notes || undefined,
        shift_id: data.selectedShift?.shift_id || undefined,
        ticket_id: data.selectedTicket?.id || undefined,
      };

      if (timePreference === 'range') {
        body.preferred_time_from = timeFrom;
        body.preferred_time_to = timeTo;
      }

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Er ging iets mis');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8 px-4 space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Je staat op de wachtlijst!</h3>
          <p className="text-sm text-gray-500 mt-1">
            We mailen je zodra er plek is op{' '}
            {dateObj && `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]}`}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Terug
      </button>

      <div>
        <h3 className="text-base font-bold text-gray-900">Zet me op de wachtlijst</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {data.party_size} gasten · {dateObj && `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]}`}
        </p>
      </div>

      {/* Time preference */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tijdvoorkeur</label>
        <div className="flex gap-2 mt-1.5">
          <button
            onClick={() => setTimePreference('any')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              timePreference === 'any'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Maakt niet uit
          </button>
          <button
            onClick={() => setTimePreference('range')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              timePreference === 'range'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Liefst tussen…
          </button>
        </div>
        {timePreference === 'range' && (
          <div className="flex gap-2 mt-2">
            <input
              type="time"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm"
            />
            <span className="self-center text-gray-400 text-sm">–</span>
            <input
              type="time"
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm"
            />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Voornaam *</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mt-1"
            placeholder="Voornaam"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Achternaam *</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mt-1"
            placeholder="Achternaam"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mt-1"
          placeholder="email@voorbeeld.nl"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefoon</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mt-1"
          placeholder="+31 6 12345678"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opmerkingen</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mt-1 resize-none"
          rows={2}
          placeholder="Bijv. allergieën, verjaardag..."
        />
      </div>

      {/* Honeypot */}
      <input
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute -left-[9999px] opacity-0 h-0"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !firstName || !lastName || !email}
        className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        ) : (
          'Op de wachtlijst zetten'
        )}
      </button>
    </div>
  );
}
