import { useState } from 'react';
import { MOCK_TICKETS, MOCK_TIME_SLOTS, INITIAL_FORM, type MockFormData } from './mockData';
import { ChevronLeft, Minus, Plus, Check } from 'lucide-react';

const PRIMARY = '#18181b';
const PRIMARY_LIGHT = '#27272a';

export function MockWidgetB() {
  const [step, setStep] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<MockFormData>(INITIAL_FORM);

  const totalSteps = 5;
  const canNext = () => {
    if (step === 1) return !!selectedTicket;
    if (step === 2) return !!selectedDate;
    if (step === 3) return !!selectedTime;
    if (step === 4) return form.firstName && form.lastName && form.email;
    return false;
  };

  const next = () => { if (canNext()) setStep(s => Math.min(s + 1, totalSteps)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  const stepLabels = ['Ervaring', 'Datum', 'Tijd', 'Gegevens'];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#FAFAFA', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Google Fonts Inter */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="shrink-0 pt-10 pb-2 px-5 text-center">
        <div className="w-12 h-12 mx-auto bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 text-[10px] font-semibold border border-zinc-200">LOGO</div>
      </header>

      {/* Stepper */}
      {step < 5 && (
        <div className="flex items-center justify-between px-6 py-3">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                  i + 1 === step ? 'bg-zinc-900 text-white' :
                  i + 1 < step ? 'bg-zinc-900 text-white' :
                  'bg-zinc-100 text-zinc-400 border border-zinc-200'
                }`}>
                  {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-medium ${i + 1 <= step ? 'text-zinc-700' : 'text-zinc-400'}`}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`w-8 h-px mx-1 mb-4 ${i + 1 < step ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Step 1: Tickets - Horizontal cards */}
        {step === 1 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Kies je ervaring</h3>
            {MOCK_TICKETS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t.id)}
                className={`w-full text-left flex rounded-2xl overflow-hidden transition-all duration-150 border ${
                  selectedTicket === t.id ? 'border-zinc-900 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'
                }`}
                style={{ backgroundColor: '#fff' }}
              >
                <div className="w-28 min-h-[100px] overflow-hidden shrink-0">
                  <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 px-4 py-3.5 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-800">{t.name}</span>
                    {t.price && <span className="text-xs text-zinc-500 font-medium">{t.price}</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.description}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-zinc-400">{t.minGuests}–{t.maxGuests} gasten</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Date & Guests */}
        {step === 2 && (
          <div className="space-y-5 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Datum & gasten</h3>
            {/* Date grid - more compact, squarer cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {dates.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDate(i)}
                  className={`flex flex-col items-center py-2 rounded-xl transition-all text-center ${
                    selectedDate === i ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
                  }`}
                >
                  <span className="text-[9px] uppercase font-medium opacity-60">{dayNames[d.getDay()]}</span>
                  <span className="text-sm font-semibold">{d.getDate()}</span>
                  <span className="text-[9px] opacity-60">{monthNames[d.getMonth()]}</span>
                </button>
              ))}
            </div>
            {/* Compact stepper */}
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-zinc-200">
              <span className="text-sm font-medium text-zinc-700">Gasten</span>
              <div className="flex items-center gap-0 border border-zinc-200 rounded-lg overflow-hidden">
                <button onClick={() => setPartySize(s => Math.max(1, s - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-50 transition-colors border-r border-zinc-200">
                  <Minus className="w-3.5 h-3.5 text-zinc-500" />
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">{partySize}</span>
                <button onClick={() => setPartySize(s => Math.min(10, s + 1))} className="w-9 h-9 flex items-center justify-center hover:bg-zinc-50 transition-colors border-l border-zinc-200">
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Time */}
        {step === 3 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Beschikbare tijden</h3>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_TIME_SLOTS.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    selectedTime === t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Details - compact with floating-ish labels */}
        {step === 4 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-zinc-800">Contactgegevens</h3>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <FloatInput label="Voornaam" value={form.firstName} onChange={v => setForm(p => ({ ...p, firstName: v }))} />
                <FloatInput label="Achternaam" value={form.lastName} onChange={v => setForm(p => ({ ...p, lastName: v }))} />
              </div>
              <FloatInput label="E-mailadres" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} type="email" />
              <FloatInput label="Telefoon (optioneel)" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} type="tel" />
              <div className="relative">
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Opmerkingen"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm resize-none focus:outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-8 space-y-5">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-zinc-800">Reservering bevestigd</h3>
              <p className="text-xs text-zinc-500">Een bevestiging is verzonden per e-mail.</p>
            </div>
            <div className="w-full bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
              <SummaryRow label="Ervaring" value={MOCK_TICKETS.find(t => t.id === selectedTicket)?.name ?? '-'} />
              <SummaryRow label="Datum" value={selectedDate !== null ? dates[selectedDate].toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : '-'} />
              <SummaryRow label="Tijd" value={selectedTime ?? '-'} />
              <SummaryRow label="Gasten" value={String(partySize)} />
              <SummaryRow label="Naam" value={`${form.firstName} ${form.lastName}`} />
              <SummaryRow label="E-mail" value={form.email} />
            </div>
            <button
              onClick={() => { setStep(1); setSelectedTicket(null); setSelectedDate(null); setPartySize(2); setSelectedTime(null); setForm(INITIAL_FORM); }}
              className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Opnieuw boeken →
            </button>
          </div>
        )}
      </div>

      {/* CTA */}
      {step < 5 && (
        <div className="shrink-0 px-5 pb-4 pt-2 flex gap-2.5">
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
            {step === 4 ? 'Bevestigen' : 'Volgende'}
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="shrink-0 pb-8 pt-1 text-center">
        <p className="text-sm font-semibold text-zinc-300 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
          Restaurant Demo
        </p>
        <span className="text-[10px] text-zinc-300">Powered by Nesto</span>
      </footer>
    </div>
  );
}

function FloatInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={label}
        className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-400"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-800">{value}</span>
    </div>
  );
}
