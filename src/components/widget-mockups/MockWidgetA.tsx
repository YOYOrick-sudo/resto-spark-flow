import { useState } from 'react';
import { MOCK_TICKETS, MOCK_TIME_SLOTS, INITIAL_FORM, type MockFormData } from './mockData';
import { ChevronLeft, ChevronRight, Minus, Plus, Check } from 'lucide-react';

const PRIMARY = '#1a1a1a';

export function MockWidgetA() {
  const [step, setStep] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<MockFormData>(INITIAL_FORM);
  const [hoveredTicket, setHoveredTicket] = useState<string | null>(null);

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

  // Mock dates (next 14 days)
  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  const getTicketShadow = (id: string, isSelected: boolean) => {
    if (isSelected) return `inset 0 0 0 2px ${PRIMARY}, 0 8px 24px -4px rgba(0,0,0,0.12)`;
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
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i + 1 === step ? 'w-6 bg-gray-800' : i + 1 < step ? 'w-1.5 bg-gray-800' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Step 1: Tickets */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 text-center">Kies je ervaring</h3>
            {MOCK_TICKETS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t.id)}
                onMouseEnter={() => setHoveredTicket(t.id)}
                onMouseLeave={() => setHoveredTicket(null)}
                className="w-full text-left rounded-[28px] overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{ boxShadow: getTicketShadow(t.id, selectedTicket === t.id) }}
              >
                <div className="relative aspect-[2.2/1] w-full overflow-hidden">
                  <img src={t.imageUrl} alt={t.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-white font-bold text-base">{t.name}</span>
                    {t.price && <span className="text-white/80 text-sm ml-2">{t.price}</span>}
                  </div>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-sm text-gray-500 leading-relaxed">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Date & Guests */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 text-center">Datum & gasten</h3>
            {/* Date scroller */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dates.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDate(i)}
                  className={`flex flex-col items-center min-w-[52px] py-2.5 px-2 rounded-2xl transition-all text-center ${
                    selectedDate === i ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  style={selectedDate !== i ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                >
                  <span className="text-[10px] uppercase font-medium opacity-70">{dayNames[d.getDay()]}</span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                  <span className="text-[10px] opacity-70">{monthNames[d.getMonth()]}</span>
                </button>
              ))}
            </div>
            {/* Guest counter */}
            <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <span className="text-sm font-medium text-gray-700">Aantal gasten</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setPartySize(s => Math.max(1, s - 1))} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-lg font-bold w-6 text-center tabular-nums">{partySize}</span>
                <button onClick={() => setPartySize(s => Math.min(10, s + 1))} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Time */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 text-center">Kies een tijd</h3>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_TIME_SLOTS.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    selectedTime === t ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  style={selectedTime !== t ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 text-center">Je gegevens</h3>
            <div className="space-y-3">
              {[
                { key: 'firstName' as const, label: 'Voornaam', type: 'text' },
                { key: 'lastName' as const, label: 'Achternaam', type: 'text' },
                { key: 'email' as const, label: 'E-mailadres', type: 'email' },
                { key: 'phone' as const, label: 'Telefoonnummer', type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Opmerkingen</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-400 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-800">Bevestigd!</h3>
              <p className="text-sm text-gray-500">Je reservering is geplaatst.</p>
            </div>
            <div className="w-full bg-white rounded-2xl p-5 space-y-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Row label="Ervaring" value={MOCK_TICKETS.find(t => t.id === selectedTicket)?.name ?? '-'} />
              <Row label="Datum" value={selectedDate !== null ? dates[selectedDate].toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : '-'} />
              <Row label="Tijd" value={selectedTime ?? '-'} />
              <Row label="Gasten" value={String(partySize)} />
              <Row label="Naam" value={`${form.firstName} ${form.lastName}`} />
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
            className="flex-1 h-12 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-40"
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
