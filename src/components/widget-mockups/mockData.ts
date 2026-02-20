export const MOCK_TICKETS = [
  {
    id: 'diner',
    name: 'Diner',
    description: 'Geniet van ons seizoensmenu in een ontspannen sfeer.',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    minGuests: 1,
    maxGuests: 10,
    price: null,
  },
  {
    id: 'chefs-table',
    name: "Chef's Table",
    description: 'Een exclusieve culinaire ervaring aan de tafel van de chef.',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80',
    minGuests: 2,
    maxGuests: 6,
    price: '€ 95 p.p.',
  },
  {
    id: 'sunday-brunch',
    name: 'Sunday Brunch',
    description: 'Ontspan met een uitgebreid brunchbuffet op zondagochtend.',
    imageUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&q=80',
    minGuests: 2,
    maxGuests: 8,
    price: '€ 45 p.p.',
  },
];

export const MOCK_TIME_SLOTS = [
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

export const POPULAR_SLOTS = ['19:00', '19:30'];
export const UNAVAILABLE_SLOTS = ['21:00'];

export const SLOT_AVAILABILITY: Record<string, 'high' | 'medium' | 'low'> = {
  '17:00': 'high',
  '17:30': 'high',
  '18:00': 'high',
  '18:30': 'medium',
  '19:00': 'medium',
  '19:30': 'low',
  '20:00': 'medium',
  '20:30': 'high',
  '21:00': 'high',
};

export type MockFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

export const INITIAL_FORM: MockFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
};

// Day-level crowdedness for 14-day lookahead
// quiet = green dot, normal = no dot, busy = orange, almost_full = red
export type DayBusyness = 'quiet' | 'normal' | 'busy' | 'almost_full';

export const DAY_AVAILABILITY: DayBusyness[] = [
  'busy',        // today (thu)
  'almost_full', // fri
  'almost_full', // sat
  'quiet',       // sun
  'quiet',       // mon
  'normal',      // tue
  'normal',      // wed
  'busy',        // thu
  'almost_full', // fri
  'almost_full', // sat
  'quiet',       // sun
  'normal',      // mon
  'quiet',       // tue
  'normal',      // wed
];

// --- Ticket availability per day/time ---

export type TicketAvailabilityRule = {
  availableDayIndices: number[]; // indices into the 14-day lookahead (null = all days)
  availableTimeSlots: string[];
  minGuests: number;
  maxGuests: number;
};

// Sunday indices in 14-day lookahead (0-indexed, starting Thursday)
// Thu(0) Fri(1) Sat(2) Sun(3) Mon(4) Tue(5) Wed(6) Thu(7) Fri(8) Sat(9) Sun(10) Mon(11) Tue(12) Wed(13)
const ALL_DAYS = Array.from({ length: 14 }, (_, i) => i);
const SUNDAY_INDICES = [3, 10];

export const BRUNCH_TIME_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];

export const TICKET_AVAILABILITY: Record<string, TicketAvailabilityRule> = {
  'diner': {
    availableDayIndices: ALL_DAYS,
    availableTimeSlots: ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
    minGuests: 1,
    maxGuests: 10,
  },
  'chefs-table': {
    availableDayIndices: ALL_DAYS.filter(i => !SUNDAY_INDICES.includes(i)), // not on sundays
    availableTimeSlots: ['18:30', '19:00', '19:30', '20:00', '20:30'],
    minGuests: 2,
    maxGuests: 6,
  },
  'sunday-brunch': {
    availableDayIndices: SUNDAY_INDICES,
    availableTimeSlots: BRUNCH_TIME_SLOTS,
    minGuests: 2,
    maxGuests: 8,
  },
};

/** Get the union of all time slots available for a given day index */
export function getTimeSlotsForDay(dayIndex: number): string[] {
  const slots = new Set<string>();
  for (const rule of Object.values(TICKET_AVAILABILITY)) {
    if (rule.availableDayIndices.includes(dayIndex)) {
      rule.availableTimeSlots.forEach(s => slots.add(s));
    }
  }
  return Array.from(slots).sort();
}

/** Check if a ticket is available for a given day/time/party combination */
export function isTicketAvailable(
  ticketId: string,
  dayIndex: number | null,
  timeSlot: string | null,
  partySize: number,
): boolean {
  const rule = TICKET_AVAILABILITY[ticketId];
  if (!rule) return false;
  if (partySize < rule.minGuests || partySize > rule.maxGuests) return false;
  if (dayIndex !== null && !rule.availableDayIndices.includes(dayIndex)) return false;
  if (timeSlot !== null && !rule.availableTimeSlots.includes(timeSlot)) return false;
  return true;
}

/** Find first available day index for a ticket */
export function firstAvailableDay(ticketId: string): number {
  const rule = TICKET_AVAILABILITY[ticketId];
  return rule?.availableDayIndices[0] ?? 0;
}

/** Find first available time slot for a ticket on a given day */
export function firstAvailableTime(ticketId: string, dayIndex: number): string | null {
  const rule = TICKET_AVAILABILITY[ticketId];
  if (!rule || !rule.availableDayIndices.includes(dayIndex)) return null;
  return rule.availableTimeSlots[0] ?? null;
}
