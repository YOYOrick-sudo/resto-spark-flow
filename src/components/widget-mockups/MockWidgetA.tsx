import { useState, useEffect } from 'react';
import { MOCK_TICKETS, MOCK_TIME_SLOTS, POPULAR_SLOTS, UNAVAILABLE_SLOTS, INITIAL_FORM, type MockFormData } from './mockData';
import { ChevronLeft, Minus, Plus, Check, Calendar, Users, User, Mail, Phone, Sparkles } from 'lucide-react';

const PRIMARY = '#1a1a1a';

export function MockWidgetA() {
  const [step, setStep] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<MockFormData>(INITIAL_FORM);
  const [hoveredTicket, setHoveredTicket] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);

  const totalSteps = 5;
  const canNext = () => {
    if (step === 1) return !!selectedTicket;
    if (step === 2) return !!selectedDate;
    if (step === 3) return !!selectedTime;
    if (step === 4) return form.firstName && form.lastName && form.email;
    return false;
  };

  const goTo = (s: number) => {
    setFadeIn(false);
    setTimeout(() => { setStep(s); setFadeIn(true); }, 150);
  };
  const next = () => { if (canNext()) goTo(Math.min(step + 1, totalSteps)); };
  const back = () => goTo(Math.max(step - 1, 1));

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  const getTicketShadow = (id: string, isSelected: boolean) => {
    if (isSelected) return `0 0 0 2px ${PRIMARY}, 0 0 20px -4px rgba(26,26,26,0.15), 0 8px 24px -4px rgba(0,0,0,0.12)`;
    if (hoveredTicket === id) return '0 4px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.04)';
    return '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.04)';
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#FAFAF8', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="shrink-0 pt-10 pb-2 px-5 text-center">
        <div className="w-14 h-14 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">LOGO</div>
      </header>

      {/* Progress dots */}
      {step < 5 && (
        <div className="flex justify-center gap-1.5 py-3">
          {Array.from({ length: totalSteps - 1 }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i + 1 === step ? 'w-6 bg-gray-800' : i + 1 < step ? 'w-1.5 bg-gray-800' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content with fade transition */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-4 transition-opacity duration-150"
        style={{ opacity: fadeIn ? 1 : 0 }}
      >
        {/* Step 1: Tickets */}
        {step === 1 && (
          <div className="space-y-4 relative">
            <h3 className="text-lg font-bold text-gray-800 text-center">Kies je ervaring</h3>
            {MOCK_TICKETS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t.id)}
                onMouseEnter={() => setHoveredTicket(t.id)}
                onMouseLeave={() => setHoveredTicket(null)}
                className="w-full text-left rounded-[28px] overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                style={{ boxShadow: getTicketShadow(t.id, selectedTicket === t.id) }}
              >
                {/* Cinematic hero image */}
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.8/1' }}>
                  <img src={t.imageUrl} alt={t.name} className="absolute inset-0 w-full h-full object-cover" />
                  {/* Dual gradient: top vignette + bottom cinematic */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Blur accent at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-12" style={{ backdropFilter: 'blur(2px)' }} />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <span className="text-white font-bold text-sm uppercase tracking-wider">{t.name}</span>
                    {t.price && (
                      <span className="text-white/80 text-xs font-medium bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        {t.price}
                      </span>
                    )}
                  </div>
                  {/* Selected indicator */}
                  {selectedTicket === t.id && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-gray-800" />
                    </div>
                  )}
                </div>
                <div className="px-5 py-3.5 bg-white">
                  <p className="text-sm text-gray-500 leading-relaxed">{t.description}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{t.minGuests}–{t.maxGuests} gasten</p>
                </div>
              </button>
            ))}
            {/* Scroll fade indicator */}
            <div className="pointer-events-none sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FAFAF8] to-transparent" />
          </div>
        )}

        {/* Step 2: Date & Guests */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 text-center">Datum & gasten</h3>
            {/* Section with icon */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {dates.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(i)}
                    className={`flex flex-col items-center min-w-[52px] py-2.5 px-2 rounded-2xl transition-all duration-200 text-center ${
                      selectedDate === i
                        ? 'bg-gray-800 text-white scale-105 shadow-lg'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                    style={selectedDate !== i ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                  >
                    <span className="text-[10px] uppercase font-medium opacity-70">{dayNames[d.getDay()]}</span>
                    <span className="text-lg font-bold">{d.getDate()}</span>
                    <span className="text-[10px] opacity-70">{monthNames[d.getMonth()]}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Guest counter with icon */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gasten</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <span className="text-sm font-medium text-gray-700">Aantal gasten</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPartySize(s => Math.max(1, s - 1))}
                    className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xl font-bold w-6 text-center tabular-nums">{partySize}</span>
                  <button
                    onClick={() => setPartySize(s => Math.min(10, s + 1))}
                    className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Time */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 text-center">Kies een tijd</h3>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_TIME_SLOTS.map(t => {
                const isUnavailable = UNAVAILABLE_SLOTS.includes(t);
                const isPopular = POPULAR_SLOTS.includes(t);
                const isSelected = selectedTime === t;
                return (
                  <button
                    key={t}
                    onClick={() => !isUnavailable && setSelectedTime(t)}
                    disabled={isUnavailable}
                    className={`relative py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isUnavailable
                        ? 'bg-gray-100 text-gray-300 line-through cursor-not-allowed'
                        : isSelected
                        ? 'bg-gray-800 text-white scale-105 shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    style={!isSelected && !isUnavailable ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                  >
                    {t}
                    {isPopular && !isSelected && !isUnavailable && (
                      <span className="absolute -top-1.5 right-2 text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                        Populair
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 text-center">Je gegevens</h3>
            <div className="space-y-3">
              {/* Name row - 2 columns */}
              <div className="grid grid-cols-2 gap-2.5">
                <IconInput icon={<User className="w-4 h-4" />} label="Voornaam" value={form.firstName} onChange={v => setForm(p => ({ ...p, firstName: v }))} />
                <IconInput icon={<User className="w-4 h-4" />} label="Achternaam" value={form.lastName} onChange={v => setForm(p => ({ ...p, lastName: v }))} />
              </div>
              <IconInput icon={<Mail className="w-4 h-4" />} label="E-mailadres" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} />
              <IconInput icon={<Phone className="w-4 h-4" />} label="Telefoonnummer" type="tel" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
              <div>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Opmerkingen"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none transition-all placeholder:text-gray-400"
                  style={{ outline: 'none' }}
                  onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(217,168,83,0.2)'; e.target.style.borderColor = '#d9a853'; }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '#e5e7eb'; }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {/* Animated checkmark with sparkles */}
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                style={{ animation: 'checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
              >
                <Check className="w-10 h-10 text-green-600" />
              </div>
              {/* CSS sparkles */}
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }} />
              <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-amber-300" style={{ animation: 'sparkle 1.5s ease-in-out 0.3s infinite' }} />
              <Sparkles className="absolute top-0 -left-3 w-3 h-3 text-amber-200" style={{ animation: 'sparkle 1.5s ease-in-out 0.6s infinite' }} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-800">Bevestigd!</h3>
              <p className="text-sm text-gray-500">Je reservering is geplaatst.</p>
            </div>

            {/* Receipt-style summary */}
            <div className="w-full bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="border-b-2 border-dashed border-gray-200 px-5 py-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold text-center">Reservering</p>
              </div>
              <div className="p-5 space-y-3">
                <Row label="Ervaring" value={MOCK_TICKETS.find(t => t.id === selectedTicket)?.name ?? '-'} />
                <Row label="Datum" value={selectedDate !== null ? dates[selectedDate].toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : '-'} />
                <Row label="Tijd" value={selectedTime ?? '-'} />
                <Row label="Gasten" value={String(partySize)} />
                <Row label="Naam" value={`${form.firstName} ${form.lastName}`} />
              </div>
              <div className="border-t-2 border-dashed border-gray-200 px-5 py-4 flex justify-center">
                {/* Fake QR code */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-0.5">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-[1px] ${[0,1,3,4,5,7,8,10,12,13,15].includes(i) ? 'bg-gray-800' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setStep(1); setSelectedTicket(null); setSelectedDate(null); setPartySize(2); setSelectedTime(null); setForm(INITIAL_FORM); }}
              className="text-sm text-gray-500 underline"
            >
              Opnieuw boeken
            </button>
          </div>
        )}
      </div>

      {/* CTA */}
      {step < 5 && (
        <div className="shrink-0 px-5 pb-4 pt-2 flex gap-3">
          {step > 1 && (
            <button onClick={back} className="h-12 w-12 rounded-[10px] bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <button
            onClick={next}
            disabled={!canNext()}
            className="flex-1 h-12 rounded-[10px] text-sm font-semibold transition-all duration-200 disabled:opacity-40"
            style={{ backgroundColor: PRIMARY, color: '#fff' }}
          >
            {step === 4 ? 'Bevestigen' : 'Volgende'}
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="shrink-0 pb-8 pt-1 text-center">
        <p className="text-lg font-extrabold text-gray-400 tracking-normal" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Restaurant Demo
        </p>
        <span className="text-[10px] text-gray-300">Powered by Nesto</span>
      </footer>

      {/* Keyframe animations */}
      <style>{`
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(15deg); }
        }
      `}</style>
    </div>
  );
}

function IconInput({ icon, label, value, onChange, type = 'text' }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={label}
        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm transition-all placeholder:text-gray-400"
        style={{ outline: 'none' }}
        onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(217,168,83,0.2)'; e.target.style.borderColor = '#d9a853'; }}
        onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = '#e5e7eb'; }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
