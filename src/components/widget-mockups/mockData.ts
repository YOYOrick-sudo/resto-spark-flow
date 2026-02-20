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
