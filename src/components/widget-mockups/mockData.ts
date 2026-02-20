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
];

export const MOCK_TIME_SLOTS = [
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

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
