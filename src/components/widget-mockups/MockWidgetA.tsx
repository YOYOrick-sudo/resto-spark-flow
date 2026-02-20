import { useState } from 'react';
import { MOCK_TICKETS, MOCK_TIME_SLOTS, SLOT_AVAILABILITY, UNAVAILABLE_SLOTS, INITIAL_FORM, DAY_AVAILABILITY, type MockFormData } from './mockData';
import { ChevronLeft, Minus, Plus, Check, Calendar, Users, User, Mail, Phone } from 'lucide-react';

const PRIMARY = '#1a1a1a';

export function MockWidgetA() {
  const [step, setStep] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<MockFormData>(INITIAL_FORM);
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

  const selectedTicketData = MOCK_TICKETS.find(t => t.id === selectedTicket);

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: '#FAFAFA', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Ambient background from selected ticket */}
      {selectedTicketData && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={selectedTicketData.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-all duration-700 ease-out"
            style={{ filter: 'blur(40px)', opacity: step < 5 ? 0.08 : 0, transform: 'scale(1.2)' }}
          />
        </div>
      )}

      {/* Content with fade transition — header + dots scroll along */}
      <div className="relative flex-1 min-h-0 z-10">
        <div
          className="h-full overflow-y-auto px-5 pb-4 transition-opacity duration-150"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
        {/* Scrollable header */}
        <header className="pt-10 pb-2 text-center">
          <div className="w-14 h-14 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">LOGO</div>
        </header>

        {/* Progress dots (inside scroll) */}
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

        {/* Step 1: Tickets */}
        {step === 1 && (
          <div className="space-y-4 relative">
            <h3 className="text-lg font-bold text-gray-800 text-center">Kies je ervaring</h3>
            {MOCK_TICKETS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t.id)}
                className="w-full text-left rounded-3xl overflow-hidden transition-all duration-200"
                style={{
                  boxShadow: selectedTicket === t.id
                    ? `0 0 0 2px ${PRIMARY}, 0 8px 20px rgba(0,0,0,0.1)`
                    : '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)'
                }}
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.4/1' }}>
                  <img src={t.imageUrl} alt={t.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <span className="text-white font-semibold text-sm">{t.name}</span>
                    {t.price && (
                      <span className="text-white font-semibold text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        vanaf {t.price}
                      </span>
                    )}
                  </div>
                  {selectedTicket === t.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5 text-gray-800" />
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 bg-white">
                  <p className="text-sm text-gray-500 leading-relaxed">{t.description}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{t.minGuests}–{t.maxGuests} gasten</p>
                </div>
              </button>
            ))}
            
          </div>
        )}

        {/* Step 2: Date & Guests */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 text-center">Datum & gasten</h3>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {dates.map((d, i) => {
                  const busyness = DAY_AVAILABILITY[i] ?? 'normal';
                  const isSelected = selectedDate === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(i)}
                      className={`flex flex-col items-center min-w-[52px] py-2.5 px-2 rounded-2xl transition-all duration-200 text-center ${
                        isSelected
                          ? 'bg-gray-800 text-white shadow-md'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                      style={!isSelected ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                    >
                      <span className="text-[10px] uppercase font-medium opacity-70">{dayNames[d.getDay()]}</span>
                      <span className="text-lg font-bold">{d.getDate()}</span>
                      <span className="text-[10px] opacity-70">{monthNames[d.getMonth()]}</span>
                      {busyness !== 'normal' && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                          isSelected
                            ? 'bg-white/50'
                            : busyness === 'quiet' ? 'bg-emerald-400'
                            : busyness === 'busy' ? 'bg-amber-400'
                            : 'bg-red-400'
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 flex items-center justify-center gap-4 pt-1">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Rustig</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Populair</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Bijna vol</span>
              </p>
            </div>
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
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xl font-bold w-6 text-center tabular-nums">{partySize}</span>
                  <button
                    onClick={() => setPartySize(s => Math.min(10, s + 1))}
                    className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
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
                const isSelected = selectedTime === t;
                const availability = SLOT_AVAILABILITY[t] ?? 'high';
                const hasLabel = !isUnavailable && availability !== 'high';
                return (
                  <button
                    key={t}
                    onClick={() => !isUnavailable && setSelectedTime(t)}
                    disabled={isUnavailable}
                    className={`flex flex-col items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                      hasLabel ? 'py-2.5 pb-4' : 'py-3'
                    } ${
                      isUnavailable
                        ? 'bg-gray-100 text-gray-300 line-through cursor-not-allowed'
                        : isSelected
                        ? 'bg-gray-800 text-white shadow-md'
                        : availability === 'low'
                        ? 'bg-red-50 text-gray-700 hover:bg-red-100'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    style={!isSelected && !isUnavailable ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                  >
                    <span>{t}</span>
                    {!isUnavailable && availability === 'medium' && (
                      <span className={`text-[10px] font-medium mt-1 ${isSelected ? 'text-white/70' : 'text-amber-600'}`}>Bijna vol</span>
                    )}
                    {!isUnavailable && availability === 'low' && (
                      <span className={`text-[10px] font-medium mt-1 ${isSelected ? 'text-white/70' : 'text-red-500'}`}>Laatste plekken</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 flex items-center justify-center gap-4 pt-1">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Bijna vol</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Laatste plekken</span>
            </p>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 text-center">Je gegevens</h3>
            <div className="space-y-3">
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none transition-all placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
              style={{ animation: 'checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
            >
              <Check className="w-10 h-10 text-green-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-800">Bevestigd!</h3>
              <p className="text-sm text-gray-500">Je reservering is geplaatst.</p>
            </div>

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
        {step < 5 && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#FAFAFA] to-transparent z-10" />
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
            {step === 4 ? 'Bevestigen' : `Volgende (${step}/4)`}
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="shrink-0 pb-8 pt-1 text-center">
        <p className="text-lg font-extrabold text-gray-400 tracking-normal" style={{ fontFamily: "'Inter', sans-serif" }}>
          Restaurant Demo
        </p>
        <span className="text-[10px] text-gray-300">Powered by Nesto</span>
      </footer>

      <style>{`
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
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
        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
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
