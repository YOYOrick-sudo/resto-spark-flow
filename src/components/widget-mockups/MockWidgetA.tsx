import { useState, useEffect, useRef } from 'react';
import {
  MOCK_TICKETS, SLOT_AVAILABILITY, UNAVAILABLE_SLOTS,
  INITIAL_FORM, DAY_AVAILABILITY,
  isTicketAvailable, getTimeSlotsForDay, firstAvailableDay, firstAvailableTime,
  type MockFormData,
} from './mockData';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minus, Plus, Check, Calendar as CalendarIcon, List, Users, User, Mail, Phone, Clock, Pencil } from 'lucide-react';

const PRIMARY = '#1a1a1a';

export function MockWidgetA() {
  const [step, setStep] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState<MockFormData>(INITIAL_FORM);
  const [fadeIn, setFadeIn] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalSteps = 3;
  const canNext = () => {
    if (step === 1) return !!selectedTicket && selectedDate !== null && !!selectedTime;
    if (step === 2) return form.firstName && form.lastName && form.email;
    return false;
  };

  const goTo = (s: number) => {
    setFadeIn(false);
    setTimeout(() => { setStep(s); setFadeIn(true); }, 150);
  };
  const next = () => { if (canNext()) goTo(Math.min(step + 1, totalSteps)); };
  const back = () => goTo(Math.max(step - 1, 1));

  const today = new Date();
  const dates = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const dayNamesShort = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const monthNamesFull = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  const selectedTicketData = MOCK_TICKETS.find(t => t.id === selectedTicket);

  // Dynamic time slots based on selected day
  const timeSlots = selectedDate !== null ? getTimeSlotsForDay(selectedDate) : getTimeSlotsForDay(0);

  // Auto-select first available date and time on mount
  useEffect(() => {
    if (selectedDate === null) {
      const day = firstAvailableDay(null);
      const initDate = day >= 0 ? day : 0;
      setSelectedDate(initDate);
      const time = firstAvailableTime(null, initDate);
      if (time) setSelectedTime(time);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ticket selection with auto-date/time
  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicket(ticketId);
    setSelectorOpen(false); // collapse selector on ticket pick
    // Auto-select first available day if none chosen or current day doesn't work
    if (selectedDate === null || !isTicketAvailable(ticketId, selectedDate, null, partySize)) {
      const day = firstAvailableDay(ticketId);
      setSelectedDate(day);
      const time = firstAvailableTime(ticketId, day);
      if (time) setSelectedTime(time);
    } else if (selectedTime && !isTicketAvailable(ticketId, selectedDate, selectedTime, partySize)) {
      const time = firstAvailableTime(ticketId, selectedDate);
      if (time) setSelectedTime(time);
    }
  };

  // Handle date selection — clear time if it's no longer valid
  const handleDateSelect = (dayIndex: number) => {
    setSelectedDate(dayIndex);
    const newSlots = getTimeSlotsForDay(dayIndex);
    if (selectedTime && !newSlots.includes(selectedTime)) {
      setSelectedTime(null);
    }
    if (selectedTicket && !isTicketAvailable(selectedTicket, dayIndex, null, partySize)) {
      // Don't deselect — just let it show as unavailable
    }
    // Scroll to selected date pill
    setTimeout(() => {
      scrollRef.current?.querySelector(`[data-day="${dayIndex}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 50);
  };

  // Handle calendar date pick → compute day index from today
  const handleCalendarDayClick = (date: Date) => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = date.getTime() - todayStart.getTime();
    const dayIndex = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < 90) {
      handleDateSelect(dayIndex);
    }
    setCalendarMode(false);
  };

  // Build month grid for inline calendar
  const buildMonthGrid = (month: Date) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const maxDate = dates[dates.length - 1];
    // Monday=0 offset
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ date: Date; dayIndex: number; inMonth: boolean; disabled: boolean }> = [];
    // Empty cells
    for (let i = 0; i < startOffset; i++) cells.push({ date: new Date(0), dayIndex: -1, inMonth: false, disabled: true });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, m, d);
      const diffMs = date.getTime() - todayStart.getTime();
      const dayIndex = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const disabled = dayIndex < 0 || dayIndex >= 90;
      cells.push({ date, dayIndex, inMonth: true, disabled });
    }
    return cells;
  };

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: '#FAFAFA', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Ambient background from selected ticket */}
      {selectedTicketData && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={selectedTicketData.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-all duration-700 ease-out"
            style={{ filter: 'blur(40px)', opacity: step < 3 ? 0.08 : 0, transform: 'scale(1.2)' }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative flex-1 min-h-0 z-10">
        <div
          className="h-full overflow-y-auto px-5 pb-4 transition-opacity duration-150"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          {/* Header */}
          <header className="pt-10 pb-2 text-center">
            <div className="w-14 h-14 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">LOGO</div>
          </header>

          {/* Progress dots */}
          {step < 3 && (
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

          {/* Step 1: Combined — Date, Guests, Time, Tickets */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Compact selector dropdown */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <button
                  onClick={() => setSelectorOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {selectorOpen ? (
                    <>
                      <span className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Je selectie</span>
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    </>
                  ) : (
                    <>
                      <span className="truncate font-medium text-gray-700">
                        {selectedDate !== null
                          ? `${dayNames[dates[selectedDate].getDay()]} ${dates[selectedDate].getDate()} ${monthNames[dates[selectedDate].getMonth()]}`
                          : '—'}
                        {' · '}{partySize} gasten{' · '}{selectedTime ?? '—'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    </>
                  )}
                </button>

                {selectorOpen && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-5">
                    {/* Date */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</span>
                        </div>
                        <button
                          onClick={() => {
                            setCalendarMode(m => !m);
                            if (!calendarMode && selectedDate !== null) {
                              setViewMonth(dates[selectedDate]);
                            }
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100"
                        >
                          {calendarMode ? <List className="w-3.5 h-3.5" /> : <CalendarIcon className="w-3.5 h-3.5" />}
                          <span>{calendarMode ? 'Week' : 'Maand'}</span>
                        </button>
                      </div>

                      <div className="relative">
                        {/* Week strip */}
                        <div
                          className={`transition-all duration-300 ${calendarMode ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}
                        >
                          <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                            {dates.map((d, i) => {
                              const busyness = DAY_AVAILABILITY[i] ?? 'normal';
                              const isSelected = selectedDate === i;
                              return (
                                <button
                                  key={i}
                                  data-day={i}
                                  onClick={() => handleDateSelect(i)}
                                  className={`flex flex-col items-center min-w-[48px] py-2 px-1.5 rounded-2xl transition-all duration-200 text-center ${
                                    isSelected
                                      ? 'bg-gray-800 text-white shadow-md'
                                      : 'bg-white text-gray-600 hover:bg-gray-100'
                                  }`}
                                  style={!isSelected ? { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } : {}}
                                >
                                  <span className="text-[10px] uppercase font-medium opacity-70">{dayNames[d.getDay()]}</span>
                                  <span className="text-base font-bold">{d.getDate()}</span>
                                  <span className="text-[10px] opacity-70">{monthNames[d.getMonth()]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Inline month calendar */}
                        <div
                          className={`transition-all duration-300 ${calendarMode ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
                        >
                          {(() => {
                            const cells = buildMonthGrid(viewMonth);
                            return (
                              <div>
                                {/* Month navigation */}
                                <div className="flex items-center justify-between mb-3">
                                  <button
                                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                                  >
                                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <span className="text-sm font-semibold text-gray-700 capitalize">
                                    {monthNamesFull[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                                  </span>
                                  <button
                                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                                  >
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  </button>
                                </div>
                                {/* Day headers */}
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                  {dayNamesShort.map(dn => (
                                    <div key={dn} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{dn}</div>
                                  ))}
                                </div>
                                {/* Day cells */}
                                <div className="grid grid-cols-7 gap-1">
                                  {cells.map((cell, idx) => {
                                    if (!cell.inMonth) return <div key={`e-${idx}`} className="h-10" />;
                                    const isSelected = selectedDate === cell.dayIndex;
                                    const busyness = DAY_AVAILABILITY[cell.dayIndex] ?? 'normal';
                                    return (
                                      <button
                                        key={idx}
                                        disabled={cell.disabled}
                                        onClick={() => !cell.disabled && handleCalendarDayClick(cell.date)}
                                        className={`h-10 w-full rounded-2xl text-sm font-semibold flex flex-col items-center justify-center transition-all duration-200 ${
                                          cell.disabled
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : isSelected
                                            ? 'bg-gray-800 text-white shadow-md'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                      >
                                        <span>{cell.date.getDate()}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Guests */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Gasten</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPartySize(s => Math.max(1, s - 1))}
                          className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="text-lg font-bold w-5 text-center tabular-nums">{partySize}</span>
                        <button
                          onClick={() => setPartySize(s => Math.min(10, s + 1))}
                          className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Time */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tijd</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {timeSlots.map(t => {
                          const isUnavailable = UNAVAILABLE_SLOTS.includes(t);
                          const isSelected = selectedTime === t;
                          const availability = SLOT_AVAILABILITY[t] ?? 'high';
                          return (
                            <button
                              key={t}
                              onClick={() => !isUnavailable && setSelectedTime(t)}
                              disabled={isUnavailable}
                              className={`flex flex-col items-center rounded-xl text-sm font-semibold py-2.5 transition-all duration-200 ${
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
                                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white/50' : 'bg-amber-400'}`} />
                              )}
                              {!isUnavailable && availability === 'low' && (
                                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white/50' : 'bg-red-400'}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kies je ervaring</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Tickets */}
              <div className="space-y-3">
                {MOCK_TICKETS.map(t => {
                  const available = isTicketAvailable(t.id, selectedDate, selectedTime, partySize);
                  const isSelected = selectedTicket === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTicketSelect(t.id)}
                      className={`w-full text-left rounded-3xl overflow-hidden transition-all duration-300 ${
                        !available ? 'opacity-40 grayscale-[30%]' : ''
                      }`}
                      style={{
                        boxShadow: isSelected
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
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5 text-gray-800" />
                          </div>
                        )}
                        {!available && (
                          <div className="absolute top-3 left-4">
                            <span className="text-white text-[11px] font-medium bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                              Niet beschikbaar
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3 bg-white">
                        <p className="text-sm text-gray-500 leading-relaxed">{t.description}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{t.minGuests}–{t.maxGuests} gasten</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 text-center">Je gegevens</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <IconInput icon={<User className="w-4 h-4" />} label="Voornaam" value={form.firstName} onChange={v => setForm(p => ({ ...p, firstName: v }))} />
                  <IconInput icon={<User className="w-4 h-4" />} label="Achternaam" value={form.lastName} onChange={v => setForm(p => ({ ...p, lastName: v }))} />
                </div>
                <IconInput icon={<Mail className="w-4 h-4" />} label="E-mailadres" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} />
                <IconInput icon={<Phone className="w-4 h-4" />} label="Telefoonnummer" type="tel" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Opmerkingen"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none transition-all placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
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
        {step < 3 && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#FAFAFA] to-transparent z-10" />
        )}
      </div>

      {/* CTA */}
      {step < 3 && (
        <div className="shrink-0 px-5 pb-4 pt-2 space-y-2">
          {/* Summary dropdown — only on step 2 */}
          {step === 2 && (
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
                    <span className="truncate">
                      {selectedDate !== null
                        ? `${dayNames[dates[selectedDate].getDay()]} ${dates[selectedDate].getDate()} ${monthNames[dates[selectedDate].getMonth()]}`
                        : '—'}
                      {' · '}{partySize} gasten · {selectedTime ?? '—'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                  </>
                )}
              </button>
              {summaryOpen && (
                <div className="border-t border-gray-100">
                  {[
                    { icon: <CalendarIcon className="w-4 h-4" />, label: 'Datum', value: selectedDate !== null ? `${dayNames[dates[selectedDate].getDay()]} ${dates[selectedDate].getDate()} ${monthNames[dates[selectedDate].getMonth()]}` : '—' },
                    { icon: <Users className="w-4 h-4" />, label: 'Gasten', value: `${partySize} gasten` },
                    { icon: <Clock className="w-4 h-4" />, label: 'Tijd', value: selectedTime ?? '—' },
                    { icon: <Check className="w-4 h-4" />, label: 'Ervaring', value: selectedTicketData?.name ?? '—' },
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
          )}

          <div className="flex gap-3">
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
              {step === 2 ? 'Bevestigen' : `Volgende (${step}/2)`}
            </button>
          </div>
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
