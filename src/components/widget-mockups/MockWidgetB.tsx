import { useState, useEffect } from 'react';
import { MOCK_TICKETS, MOCK_TIME_SLOTS, SLOT_AVAILABILITY, UNAVAILABLE_SLOTS, INITIAL_FORM, DAY_AVAILABILITY, TICKET_AVAILABILITY, type MockFormData } from './mockData';
import { ChevronLeft, Minus, Plus, Check, CalendarPlus, Copy } from 'lucide-react';

const PRIMARY = '#18181b';

export function MockWidgetB() {
  const [step, setStep] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<MockFormData>(INITIAL_FORM);
  const [fadeIn, setFadeIn] = useState(true);

  const totalSteps = 5;
  const canNext = () => {
    if (step === 1) return !!selectedDate;
    if (step === 2) return !!selectedTime;
    if (step === 3) return !!selectedTicket;
    if (step === 4) return form.firstName && form.lastName && form.email;
    return false;
  };

  const goTo = (s: number) => {
    setFadeIn(false);
    setTimeout(() => { setStep(s); setFadeIn(true); }, 120);
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

  const stepLabels = ['Datum', 'Tijd', 'Ervaring', 'Gegevens'];

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const selectedTicketData = MOCK_TICKETS.find(t => t.id === selectedTicket);

  // Filtered tickets based on selected time
  const availableTicketIds = selectedTime ? (TICKET_AVAILABILITY[selectedTime] ?? []) : [];
  const availableTickets = MOCK_TICKETS.filter(t => availableTicketIds.includes(t.id));
  const unavailableTickets = MOCK_TICKETS.filter(t => !availableTicketIds.includes(t.id));

  // Auto-skip: if only 1 ticket available, auto-select and skip to step 4
  useEffect(() => {
    if (step === 3 && availableTickets.length === 1) {
      setSelectedTicket(availableTickets[0].id);
      setTimeout(() => goTo(4), 300);
    }
  }, [step]);

  // Reset ticket when time changes
  useEffect(() => {
    if (selectedTicket && selectedTime && !availableTicketIds.includes(selectedTicket)) {
      setSelectedTicket(null);
    }
  }, [selectedTime]);

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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="shrink-0 pt-10 pb-2 px-5 text-center relative z-10">
        <div className="w-12 h-12 mx-auto bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 text-[10px] font-semibold border border-zinc-200">LOGO</div>
      </header>

      {/* Enhanced Stepper */}
      {step < 5 && (
        <div className="flex items-center justify-between px-6 py-3 relative z-10">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    i + 1 === step
                      ? 'bg-zinc-900 text-white shadow-md'
                      : i + 1 < step
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                  }`}
                  style={i + 1 === step ? { animation: 'stepPulse 2s ease-in-out infinite' } : {}}
                >
                  {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-medium transition-colors ${i + 1 <= step ? 'text-zinc-700' : 'text-zinc-400'}`}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className="w-8 h-0.5 mx-1 mb-4 rounded-full overflow-hidden bg-zinc-200">
                  <div
                    className="h-full bg-zinc-900 transition-all duration-500 rounded-full"
                    style={{ width: i + 1 < step ? '100%' : i + 1 === step ? '50%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content with fade */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-4 transition-opacity duration-120 relative z-10"
        style={{ opacity: fadeIn ? 1 : 0 }}
      >
        {/* Step 1: Date & Guests */}
        {step === 1 && (
          <div className="space-y-5 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Datum & gasten</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {dates.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = i === 0;
                const isSelected = selectedDate === i;
                const busyness = DAY_AVAILABILITY[i] ?? 'normal';
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(i)}
                    className={`flex flex-col items-center py-2 rounded-xl transition-all duration-200 text-center ${
                      isSelected
                        ? 'bg-zinc-900 text-white'
                        : isWeekend
                        ? 'bg-amber-50 text-zinc-600 hover:bg-amber-100 border border-amber-200/60'
                        : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-medium opacity-60">{dayNames[d.getDay()]}</span>
                    <span className="text-sm font-semibold">{d.getDate()}</span>
                    <span className="text-[9px] opacity-60">{monthNames[d.getMonth()]}</span>
                    {isToday && !isSelected && busyness === 'normal' && (
                      <div className="w-1 h-1 rounded-full bg-zinc-900 mt-0.5" />
                    )}
                    {busyness !== 'normal' && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
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
            <p className="text-[10px] text-zinc-400 flex items-center justify-center gap-4 pt-1">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Rustig</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Populair</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Bijna vol</span>
            </p>
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-zinc-200">
              <span className="text-sm font-medium text-zinc-700">Gasten</span>
              <div className="flex items-center gap-0 border border-zinc-200 rounded-full overflow-hidden">
                <button onClick={() => setPartySize(s => Math.max(1, s - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-50 transition-colors border-r border-zinc-200">
                  <Minus className="w-3.5 h-3.5 text-zinc-500" />
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}>{partySize}</span>
                <button onClick={() => setPartySize(s => Math.min(10, s + 1))} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-50 transition-colors border-l border-zinc-200">
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Time */}
        {step === 2 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Beschikbare tijden</h3>
            <div className="flex flex-wrap gap-2">
              {MOCK_TIME_SLOTS.map(t => {
                const isUnavailable = UNAVAILABLE_SLOTS.includes(t);
                const isSelected = selectedTime === t;
                const availability = SLOT_AVAILABILITY[t] ?? 'high';

                return (
                  <button
                    key={t}
                    onClick={() => !isUnavailable && setSelectedTime(t)}
                    disabled={isUnavailable}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-150 border ${
                      isUnavailable
                        ? 'bg-zinc-100 text-zinc-300 border-zinc-100 cursor-not-allowed line-through'
                        : isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {!isSelected && !isUnavailable && availability === 'medium' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                    {!isSelected && !isUnavailable && availability === 'low' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ boxShadow: '0 0 4px rgba(239,68,68,0.3)' }} />
                    )}
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-400 flex items-center gap-4 pt-1">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Bijna vol</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Laatste plekken</span>
            </p>
          </div>
        )}

        {/* Step 3: Tickets (filtered by availability) */}
        {step === 3 && (
          <div className="space-y-2.5 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Beschikbaar voor jouw selectie</h3>
            <p className="text-xs text-zinc-500 -mt-1">
              {selectedDate !== null && dates[selectedDate].toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} om {selectedTime} · {partySize} {partySize === 1 ? 'gast' : 'gasten'}
            </p>
            {availableTickets.map(t => {
              const isSelected = selectedTicket === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t.id)}
                  className={`w-full text-left flex rounded-3xl overflow-hidden transition-all duration-200 border ${
                    isSelected
                      ? 'border-zinc-900 shadow-md bg-zinc-50'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 bg-white'
                  }`}
                  style={isSelected ? { boxShadow: '0 0 0 1px #18181b, 0 4px 12px rgba(0,0,0,0.08)' } : {}}
                >
                  <div className="w-24 min-h-[88px] overflow-hidden shrink-0 relative">
                    <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[1px]" />
                    )}
                  </div>
                  <div className="flex-1 px-3.5 py-3 flex items-center gap-3">
                    <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-zinc-900' : 'border-zinc-300'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-800">{t.name}</span>
                        {t.price && <span className="text-sm font-bold text-zinc-800">vanaf {t.price}</span>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{t.description}</p>
                      <span className="text-[10px] text-zinc-400 mt-1 inline-block">{t.minGuests}–{t.maxGuests} gasten</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {unavailableTickets.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs text-zinc-400 font-medium">Niet beschikbaar om {selectedTime}</p>
                {unavailableTickets.map(t => (
                  <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-zinc-100/60 px-4 py-3 opacity-50">
                    <img src={t.imageUrl} alt={t.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <span className="text-sm font-medium text-zinc-500">{t.name}</span>
                      <p className="text-[10px] text-zinc-400">Niet beschikbaar</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Form */}
        {step === 4 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Contactgegevens</h3>
            <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-zinc-100">
                <StackedInput label="Voornaam" value={form.firstName} onChange={v => setForm(p => ({ ...p, firstName: v }))} />
                <StackedInput label="Achternaam" value={form.lastName} onChange={v => setForm(p => ({ ...p, lastName: v }))} />
              </div>
              <div className="relative">
                <StackedInput label="E-mailadres" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} />
                {form.email && isValidEmail(form.email) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
              </div>
              <StackedInput label="Telefoon (optioneel)" type="tel" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
            </div>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Opmerkingen"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm resize-none focus:outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-400"
            />
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="flex flex-col py-6 space-y-5">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Reservering bevestigd</p>
                <p className="text-xs text-emerald-600">Een bevestiging is verzonden per e-mail.</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-100 rounded-lg px-4 py-2.5">
              <span className="text-xs text-zinc-500">Referentie</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-800 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>#NES-2847</span>
                <Copy className="w-3.5 h-3.5 text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors" />
              </div>
            </div>

            <div className="space-y-0">
              <TimelineItem label="Ervaring" value={MOCK_TICKETS.find(t => t.id === selectedTicket)?.name ?? '-'} isFirst />
              <TimelineItem label="Datum" value={selectedDate !== null ? dates[selectedDate].toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : '-'} />
              <TimelineItem label="Tijd" value={selectedTime ?? '-'} />
              <TimelineItem label="Gasten" value={String(partySize)} />
              <TimelineItem label="Naam" value={`${form.firstName} ${form.lastName}`} />
              <TimelineItem label="E-mail" value={form.email} isLast />
            </div>

            <button className="flex items-center justify-center gap-2 h-10 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
              <CalendarPlus className="w-4 h-4" />
              Toevoegen aan agenda
            </button>

            <button
              onClick={() => { setStep(1); setSelectedTicket(null); setSelectedDate(null); setPartySize(2); setSelectedTime(null); setForm(INITIAL_FORM); }}
              className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors text-center"
            >
              Opnieuw boeken →
            </button>
          </div>
        )}
      </div>

      {/* CTA */}
      {step < 5 && (
        <div className="shrink-0 px-5 pb-4 pt-2 space-y-1.5 relative z-10">
          <div className="flex gap-2.5">
            {step > 1 && (
              <button onClick={back} className="h-11 w-11 rounded-xl bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors">
                <ChevronLeft className="w-4 h-4 text-zinc-600" />
              </button>
            )}
            <button
              onClick={next}
              disabled={!canNext()}
              className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: PRIMARY, color: '#fff' }}
            >
              {step === 4 ? 'Bevestigen' : `Volgende (${step}/4)`}
            </button>
          </div>
          <p className="text-[10px] text-zinc-300 text-center">Druk Enter ↵</p>
        </div>
      )}

      {/* Footer */}
      <footer className="shrink-0 pb-8 pt-1 text-center">
        <p className="text-sm font-semibold text-zinc-300 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
          Restaurant Demo
        </p>
        <span className="text-[10px] text-zinc-300">Powered by Nesto</span>
      </footer>

      <style>{`
        @keyframes stepPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(24,24,27,0.15); }
          50% { box-shadow: 0 0 0 4px rgba(24,24,27,0.08); }
        }
      `}</style>
    </div>
  );
}

function StackedInput({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={label}
      className="w-full h-11 px-3.5 bg-transparent text-sm focus:outline-none focus:bg-zinc-50 transition-colors placeholder:text-zinc-400"
    />
  );
}

function TimelineItem({ label, value, isFirst, isLast }: {
  label: string; value: string; isFirst?: boolean; isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center w-4">
        {!isFirst && <div className="w-px h-2 bg-zinc-200" />}
        <div className="w-2.5 h-2.5 rounded-full border-2 border-zinc-300 bg-white shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-zinc-200" />}
      </div>
      <div className="flex justify-between flex-1 pb-3 min-w-0">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-sm font-medium text-zinc-800 text-right truncate ml-2">{value}</span>
      </div>
    </div>
  );
}
