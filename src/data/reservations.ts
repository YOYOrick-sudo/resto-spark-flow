// ============================================================================
// RESERVATIONS MODULE - Types & Mock Data
// ============================================================================

// --- Types ---

export type ReservationStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'checked_in' 
  | 'seated' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export interface Zone {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Table {
  id: string;
  number: number;
  zoneId: string;
  minCapacity: number;
  maxCapacity: number;
  isActive: boolean;
  isOnlineBookable: boolean;
}

export interface Reservation {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  salutation: 'dhr' | 'mevr' | '';
  phone: string;
  email: string;
  countryCode: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  guests: number;
  tableIds: string[];
  shift: 'ED' | 'LD';
  status: ReservationStatus;
  notes: string;
  isVip: boolean;
  isWalkIn: boolean;
  ticketType: string;
  createdAt: string;
}

export interface ShiftConfig {
  id: string;
  name: string;
  shortName: 'ED' | 'LD';
  startTime: string;
  endTime: string;
  color: string;
}

// --- Status Configuration ---

export const reservationStatusConfig: Record<ReservationStatus, {
  label: string;
  dotColor: string;
  badgeVariant: 'default' | 'primary' | 'success' | 'pending' | 'warning' | 'error' | 'outline';
}> = {
  pending: {
    label: 'Pending',
    dotColor: 'hsl(var(--muted-foreground))',
    badgeVariant: 'outline',
  },
  confirmed: {
    label: 'Confirmed',
    dotColor: 'hsl(var(--primary))',
    badgeVariant: 'primary',
  },
  checked_in: {
    label: 'Checked in',
    dotColor: 'hsl(160 84% 39%)',
    badgeVariant: 'success',
  },
  seated: {
    label: 'Seated',
    dotColor: 'hsl(160 84% 39%)',
    badgeVariant: 'success',
  },
  completed: {
    label: 'Completed',
    dotColor: 'hsl(var(--muted-foreground))',
    badgeVariant: 'outline',
  },
  cancelled: {
    label: 'Cancelled',
    dotColor: 'hsl(0 74% 60%)',
    badgeVariant: 'error',
  },
  no_show: {
    label: 'No show',
    dotColor: 'hsl(36 100% 50%)',
    badgeVariant: 'warning',
  },
};

// --- Mock Data ---

export const mockZones: Zone[] = [
  { id: 'zone-1', name: 'Binnen aan tafel', sortOrder: 1, isActive: true },
  { id: 'zone-2', name: "Chef's bar", sortOrder: 2, isActive: true },
  { id: 'zone-3', name: 'Bar - voor het raam', sortOrder: 3, isActive: true },
  { id: 'zone-4', name: 'Terras', sortOrder: 4, isActive: true },
];

export const mockTables: Table[] = [
  // Binnen aan tafel (zone-1)
  { id: 'table-1', number: 1, zoneId: 'zone-1', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: true },
  { id: 'table-2', number: 2, zoneId: 'zone-1', minCapacity: 2, maxCapacity: 4, isActive: true, isOnlineBookable: true },
  { id: 'table-3', number: 3, zoneId: 'zone-1', minCapacity: 4, maxCapacity: 6, isActive: true, isOnlineBookable: true },
  { id: 'table-4', number: 4, zoneId: 'zone-1', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: false },
  { id: 'table-5', number: 5, zoneId: 'zone-1', minCapacity: 6, maxCapacity: 8, isActive: true, isOnlineBookable: true },
  { id: 'table-6', number: 6, zoneId: 'zone-1', minCapacity: 2, maxCapacity: 4, isActive: true, isOnlineBookable: true },
  // Chef's bar (zone-2)
  { id: 'table-100', number: 100, zoneId: 'zone-2', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: true },
  { id: 'table-101', number: 101, zoneId: 'zone-2', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: true },
  { id: 'table-102', number: 102, zoneId: 'zone-2', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: false },
  { id: 'table-103', number: 103, zoneId: 'zone-2', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: true },
  // Bar - voor het raam (zone-3)
  { id: 'table-200', number: 200, zoneId: 'zone-3', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: true },
  { id: 'table-201', number: 201, zoneId: 'zone-3', minCapacity: 2, maxCapacity: 4, isActive: true, isOnlineBookable: true },
  { id: 'table-202', number: 202, zoneId: 'zone-3', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: false },
  // Terras (zone-4)
  { id: 'table-300', number: 300, zoneId: 'zone-4', minCapacity: 2, maxCapacity: 4, isActive: true, isOnlineBookable: true },
  { id: 'table-301', number: 301, zoneId: 'zone-4', minCapacity: 4, maxCapacity: 6, isActive: true, isOnlineBookable: true },
  { id: 'table-302', number: 302, zoneId: 'zone-4', minCapacity: 2, maxCapacity: 2, isActive: true, isOnlineBookable: true },
  { id: 'table-303', number: 303, zoneId: 'zone-4', minCapacity: 2, maxCapacity: 4, isActive: true, isOnlineBookable: true },
  { id: 'table-304', number: 304, zoneId: 'zone-4', minCapacity: 6, maxCapacity: 8, isActive: true, isOnlineBookable: true },
];

export const mockShifts: ShiftConfig[] = [
  { 
    id: 'shift-ed', 
    name: 'Early Dinner', 
    shortName: 'ED', 
    startTime: '16:00', 
    endTime: '18:30',
    color: 'hsl(var(--primary))',
  },
  { 
    id: 'shift-ld', 
    name: 'Late Dinner', 
    shortName: 'LD', 
    startTime: '18:30', 
    endTime: '23:00',
    color: 'hsl(280 60% 50%)',
  },
];

// Helper to get today and nearby dates
const getDateString = (daysFromToday: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split('T')[0];
};

const today = getDateString(0);
const tomorrow = getDateString(1);
const dayAfterTomorrow = getDateString(2);

export const mockReservations: Reservation[] = [
  // Today - ED shift
  {
    id: 'res-1',
    guestFirstName: 'Sophie',
    guestLastName: 'de Vries',
    salutation: 'mevr',
    phone: '612345678',
    email: 'sophie@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '16:00',
    endTime: '18:00',
    guests: 2,
    tableIds: ['table-1'],
    shift: 'ED',
    status: 'checked_in',
    notes: '',
    isVip: true,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T10:00:00Z',
  },
  {
    id: 'res-2',
    guestFirstName: 'Jan',
    guestLastName: 'Bakker',
    salutation: 'dhr',
    phone: '623456789',
    email: 'jan.bakker@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '16:15',
    endTime: '18:15',
    guests: 4,
    tableIds: ['table-2'],
    shift: 'ED',
    status: 'confirmed',
    notes: 'Allergie voor noten',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T11:00:00Z',
  },
  {
    id: 'res-3',
    guestFirstName: 'Emma',
    guestLastName: 'Jansen',
    salutation: 'mevr',
    phone: '634567890',
    email: 'emma.j@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '16:30',
    endTime: '18:30',
    guests: 6,
    tableIds: ['table-3'],
    shift: 'ED',
    status: 'pending',
    notes: 'Verjaardag! Graag taart klaarzetten',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Celebration Package',
    createdAt: '2024-12-28T12:00:00Z',
  },
  {
    id: 'res-4',
    guestFirstName: 'Thomas',
    guestLastName: 'Smit',
    salutation: 'dhr',
    phone: '645678901',
    email: 'thomas@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '17:00',
    endTime: '19:00',
    guests: 2,
    tableIds: ['table-100'],
    shift: 'ED',
    status: 'confirmed',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: "Chef's Table Experience",
    createdAt: '2024-12-28T13:00:00Z',
  },
  {
    id: 'res-5',
    guestFirstName: 'Lisa',
    guestLastName: 'van Dijk',
    salutation: 'mevr',
    phone: '656789012',
    email: 'lisa.vd@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '17:30',
    endTime: '19:30',
    guests: 2,
    tableIds: ['table-4'],
    shift: 'ED',
    status: 'checked_in',
    notes: 'Vegetarisch menu',
    isVip: true,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T14:00:00Z',
  },
  // Today - LD shift
  {
    id: 'res-6',
    guestFirstName: 'Pieter',
    guestLastName: 'Mulder',
    salutation: 'dhr',
    phone: '667890123',
    email: 'pieter.m@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '18:30',
    endTime: '20:30',
    guests: 4,
    tableIds: ['table-2'],
    shift: 'LD',
    status: 'confirmed',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T15:00:00Z',
  },
  {
    id: 'res-7',
    guestFirstName: 'Anna',
    guestLastName: 'de Boer',
    salutation: 'mevr',
    phone: '678901234',
    email: 'anna.db@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '19:00',
    endTime: '21:00',
    guests: 8,
    tableIds: ['table-5'],
    shift: 'LD',
    status: 'pending',
    notes: 'Zakelijk diner, factuur nodig',
    isVip: true,
    isWalkIn: false,
    ticketType: 'Business Dinner',
    createdAt: '2024-12-28T16:00:00Z',
  },
  {
    id: 'res-8',
    guestFirstName: 'Mark',
    guestLastName: 'Visser',
    salutation: 'dhr',
    phone: '689012345',
    email: 'mark.v@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '19:30',
    endTime: '21:30',
    guests: 2,
    tableIds: ['table-101'],
    shift: 'LD',
    status: 'confirmed',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: "Chef's Table Experience",
    createdAt: '2024-12-28T17:00:00Z',
  },
  {
    id: 'res-9',
    guestFirstName: 'Julia',
    guestLastName: 'Hendriks',
    salutation: 'mevr',
    phone: '690123456',
    email: 'julia.h@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '20:00',
    endTime: '22:00',
    guests: 2,
    tableIds: ['table-200'],
    shift: 'LD',
    status: 'pending',
    notes: 'Eerste date, graag rustig tafeltje',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T18:00:00Z',
  },
  {
    id: 'res-10',
    guestFirstName: '',
    guestLastName: 'Walk-in',
    salutation: '',
    phone: '',
    email: '',
    countryCode: 'NL',
    date: today,
    startTime: '18:45',
    endTime: '20:45',
    guests: 2,
    tableIds: ['table-6'],
    shift: 'LD',
    status: 'seated',
    notes: '',
    isVip: false,
    isWalkIn: true,
    ticketType: 'Walk-in',
    createdAt: today + 'T18:45:00Z',
  },
  // Tomorrow reservations
  {
    id: 'res-11',
    guestFirstName: 'Robert',
    guestLastName: 'van den Berg',
    salutation: 'dhr',
    phone: '601234567',
    email: 'robert.vdb@example.nl',
    countryCode: 'NL',
    date: tomorrow,
    startTime: '16:00',
    endTime: '18:00',
    guests: 4,
    tableIds: ['table-2'],
    shift: 'ED',
    status: 'confirmed',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-29T10:00:00Z',
  },
  {
    id: 'res-12',
    guestFirstName: 'Mieke',
    guestLastName: 'Koster',
    salutation: 'mevr',
    phone: '602345678',
    email: 'mieke.k@example.nl',
    countryCode: 'NL',
    date: tomorrow,
    startTime: '17:00',
    endTime: '19:00',
    guests: 2,
    tableIds: ['table-1'],
    shift: 'ED',
    status: 'confirmed',
    notes: 'Trouwdag',
    isVip: true,
    isWalkIn: false,
    ticketType: 'Celebration Package',
    createdAt: '2024-12-29T11:00:00Z',
  },
  {
    id: 'res-13',
    guestFirstName: 'Daan',
    guestLastName: 'Peters',
    salutation: 'dhr',
    phone: '603456789',
    email: 'daan.p@example.nl',
    countryCode: 'NL',
    date: tomorrow,
    startTime: '19:00',
    endTime: '21:00',
    guests: 6,
    tableIds: ['table-3'],
    shift: 'LD',
    status: 'pending',
    notes: 'Glutenvrij nodig voor 2 personen',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-29T12:00:00Z',
  },
  {
    id: 'res-14',
    guestFirstName: 'Eva',
    guestLastName: 'Willems',
    salutation: 'mevr',
    phone: '604567890',
    email: 'eva.w@example.nl',
    countryCode: 'NL',
    date: tomorrow,
    startTime: '20:00',
    endTime: '22:00',
    guests: 2,
    tableIds: ['table-102'],
    shift: 'LD',
    status: 'confirmed',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: "Chef's Table Experience",
    createdAt: '2024-12-29T13:00:00Z',
  },
  // Day after tomorrow
  {
    id: 'res-15',
    guestFirstName: 'Steven',
    guestLastName: 'Brouwer',
    salutation: 'dhr',
    phone: '605678901',
    email: 'steven.b@example.nl',
    countryCode: 'NL',
    date: dayAfterTomorrow,
    startTime: '18:30',
    endTime: '20:30',
    guests: 10,
    tableIds: ['table-3', 'table-5'],
    shift: 'LD',
    status: 'confirmed',
    notes: 'Groot gezelschap, 2 tafels samengevoegd',
    isVip: true,
    isWalkIn: false,
    ticketType: 'Group Dining',
    createdAt: '2024-12-29T14:00:00Z',
  },
  {
    id: 'res-16',
    guestFirstName: 'Laura',
    guestLastName: 'van Leeuwen',
    salutation: 'mevr',
    phone: '606789012',
    email: 'laura.vl@example.nl',
    countryCode: 'NL',
    date: dayAfterTomorrow,
    startTime: '16:30',
    endTime: '18:30',
    guests: 2,
    tableIds: ['table-300'],
    shift: 'ED',
    status: 'confirmed',
    notes: 'Terras indien mooi weer',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-29T15:00:00Z',
  },
  // Cancelled/No-show examples
  {
    id: 'res-17',
    guestFirstName: 'Henk',
    guestLastName: 'de Jong',
    salutation: 'dhr',
    phone: '607890123',
    email: 'henk.dj@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '17:00',
    endTime: '19:00',
    guests: 4,
    tableIds: ['table-201'],
    shift: 'ED',
    status: 'cancelled',
    notes: 'Geannuleerd door gast',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-27T10:00:00Z',
  },
  {
    id: 'res-18',
    guestFirstName: 'Karin',
    guestLastName: 'Meijer',
    salutation: 'mevr',
    phone: '608901234',
    email: 'karin.m@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '16:45',
    endTime: '18:45',
    guests: 2,
    tableIds: ['table-202'],
    shift: 'ED',
    status: 'no_show',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-27T11:00:00Z',
  },
  // Additional reservations for better grid testing - Today
  {
    id: 'res-19',
    guestFirstName: 'Willem',
    guestLastName: 'Groot',
    salutation: 'dhr',
    phone: '610111213',
    email: 'willem.g@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '14:00',
    endTime: '16:00',
    guests: 2,
    tableIds: ['table-1'],
    shift: 'ED',
    status: 'completed',
    notes: 'Lunch reservering',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T09:00:00Z',
  },
  {
    id: 'res-20',
    guestFirstName: 'Marieke',
    guestLastName: 'Bos',
    salutation: 'mevr',
    phone: '610222324',
    email: 'marieke.b@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '13:30',
    endTime: '15:30',
    guests: 4,
    tableIds: ['table-3'],
    shift: 'ED',
    status: 'completed',
    notes: '',
    isVip: true,
    isWalkIn: false,
    ticketType: 'Business Lunch',
    createdAt: '2024-12-28T08:00:00Z',
  },
  {
    id: 'res-21',
    guestFirstName: 'Bas',
    guestLastName: 'Vermeer',
    salutation: 'dhr',
    phone: '610333435',
    email: 'bas.v@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '20:30',
    endTime: '22:30',
    guests: 2,
    tableIds: ['table-4'],
    shift: 'LD',
    status: 'confirmed',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T16:00:00Z',
  },
  {
    id: 'res-22',
    guestFirstName: 'Fleur',
    guestLastName: 'Dekker',
    salutation: 'mevr',
    phone: '610444546',
    email: 'fleur.d@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '21:00',
    endTime: '23:00',
    guests: 6,
    tableIds: ['table-5'],
    shift: 'LD',
    status: 'confirmed',
    notes: 'Vrijgezellenfeest',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Celebration Package',
    createdAt: '2024-12-28T17:00:00Z',
  },
  {
    id: 'res-23',
    guestFirstName: 'Rick',
    guestLastName: 'van Houten',
    salutation: 'dhr',
    phone: '610555657',
    email: 'rick.vh@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '17:15',
    endTime: '19:15',
    guests: 2,
    tableIds: ['table-103'],
    shift: 'ED',
    status: 'seated',
    notes: '',
    isVip: false,
    isWalkIn: false,
    ticketType: "Chef's Table Experience",
    createdAt: '2024-12-28T14:30:00Z',
  },
  {
    id: 'res-24',
    guestFirstName: '',
    guestLastName: 'Walk-in',
    salutation: '',
    phone: '',
    email: '',
    countryCode: 'NL',
    date: today,
    startTime: '14:30',
    endTime: '16:30',
    guests: 3,
    tableIds: ['table-301'],
    shift: 'ED',
    status: 'completed',
    notes: '',
    isVip: false,
    isWalkIn: true,
    ticketType: 'Walk-in',
    createdAt: today + 'T14:30:00Z',
  },
  {
    id: 'res-25',
    guestFirstName: 'Jolanda',
    guestLastName: 'Kramer',
    salutation: 'mevr',
    phone: '610666768',
    email: 'jolanda.k@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '18:00',
    endTime: '20:00',
    guests: 4,
    tableIds: ['table-300'],
    shift: 'LD',
    status: 'confirmed',
    notes: 'Graag tafel op terras',
    isVip: false,
    isWalkIn: false,
    ticketType: 'Regular',
    createdAt: '2024-12-28T12:00:00Z',
  },
  {
    id: 'res-26',
    guestFirstName: 'Oscar',
    guestLastName: 'Vos',
    salutation: 'dhr',
    phone: '610777879',
    email: 'oscar.v@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '19:45',
    endTime: '21:45',
    guests: 2,
    tableIds: ['table-102'],
    shift: 'LD',
    status: 'pending',
    notes: 'Huwelijksaanzoek!',
    isVip: true,
    isWalkIn: false,
    ticketType: "Chef's Table Experience",
    createdAt: '2024-12-28T18:00:00Z',
  },
  {
    id: 'res-27',
    guestFirstName: 'Nina',
    guestLastName: 'van der Berg',
    salutation: 'mevr',
    phone: '610888990',
    email: 'nina.vdb@example.nl',
    countryCode: 'NL',
    date: today,
    startTime: '22:00',
    endTime: '00:00',
    guests: 4,
    tableIds: ['table-302', 'table-303'],
    shift: 'LD',
    status: 'confirmed',
    notes: 'Late night drinks en bites',
    isVip: false,
    isWalkIn: false,
    ticketType: 'After Dinner',
    createdAt: '2024-12-28T19:00:00Z',
  },
];

// Mutable copy for drag & drop updates
let mutableReservations = [...mockReservations];

export function updateReservationPosition(
  reservationId: string,
  newTableId: string,
  newStartTime: string
): Reservation | null {
  const resIndex = mutableReservations.findIndex(r => r.id === reservationId);
  if (resIndex === -1) return null;

  const reservation = mutableReservations[resIndex];
  
  // Calculate duration to preserve it
  const [startH, startM] = reservation.startTime.split(':').map(Number);
  const [endH, endM] = reservation.endTime.split(':').map(Number);
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  
  // Calculate new end time
  const [newStartH, newStartM] = newStartTime.split(':').map(Number);
  const newEndMinutes = newStartH * 60 + newStartM + durationMinutes;
  const newEndH = Math.floor(newEndMinutes / 60);
  const newEndM = newEndMinutes % 60;
  const newEndTime = `${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`;
  
  // Update reservation
  const updatedReservation: Reservation = {
    ...reservation,
    tableIds: [newTableId],
    startTime: newStartTime,
    endTime: newEndTime,
  };
  
  mutableReservations[resIndex] = updatedReservation;
  
  return updatedReservation;
}

export function getReservationsForTableMutable(date: string, tableId: string): Reservation[] {
  return mutableReservations.filter(
    r => r.date === date && r.tableIds.includes(tableId)
  );
}

// --- Helper Functions ---

export function getTableById(tableId: string): Table | undefined {
  return mockTables.find(t => t.id === tableId);
}

export function getZoneById(zoneId: string): Zone | undefined {
  return mockZones.find(z => z.id === zoneId);
}

export function getTableNumbers(tableIds: string[]): string {
  return tableIds
    .map(id => getTableById(id)?.number)
    .filter(Boolean)
    .join(', ');
}

export function getReservationsForDate(date: string): Reservation[] {
  return mockReservations.filter(r => r.date === date);
}

export function getGuestDisplayName(reservation: Reservation): string {
  if (reservation.isWalkIn) return 'Walk-in';
  const parts = [reservation.guestFirstName, reservation.guestLastName].filter(Boolean);
  return parts.join(' ') || 'Onbekende gast';
}

export function getTotalGuestsForDate(date: string): number {
  return getReservationsForDate(date)
    .filter(r => r.status !== 'cancelled' && r.status !== 'no_show')
    .reduce((sum, r) => sum + r.guests, 0);
}

export function getShiftForTime(time: string): 'ED' | 'LD' {
  const [hours, minutes] = time.split(':').map(Number);
  const timeMinutes = hours * 60 + minutes;
  const edEnd = 18 * 60 + 30; // 18:30
  return timeMinutes < edEnd ? 'ED' : 'LD';
}

// --- Grid View Helper Functions ---

export function getTablesByZone(zoneId: string): Table[] {
  return mockTables
    .filter(t => t.zoneId === zoneId && t.isActive)
    .sort((a, b) => a.number - b.number);
}

export function getActiveZones(): Zone[] {
  return mockZones
    .filter(z => z.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getReservationsForTable(date: string, tableId: string): Reservation[] {
  return mockReservations.filter(
    r => r.date === date && r.tableIds.includes(tableId)
  );
}

export function getSeatedCountAtTime(date: string, time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const checkTimeMinutes = hours * 60 + minutes;
  
  return mockReservations
    .filter(r => {
      if (r.date !== date) return false;
      if (r.status === 'cancelled' || r.status === 'no_show') return false;
      
      const [startH, startM] = r.startTime.split(':').map(Number);
      const [endH, endM] = r.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      return checkTimeMinutes >= startMinutes && checkTimeMinutes < endMinutes;
    })
    .reduce((sum, r) => sum + r.guests, 0);
}

export interface GridTimeConfig {
  startHour: number; // e.g., 13 for 13:00
  endHour: number;   // e.g., 25 for 01:00 next day (24 + 1)
  intervalMinutes: number; // e.g., 15
  pixelsPerMinute: number; // e.g., 2
}

export const defaultGridConfig: GridTimeConfig = {
  startHour: 13,
  endHour: 25, // 01:00 next day
  intervalMinutes: 15,
  pixelsPerMinute: 2,
};

export function calculateBlockPosition(
  startTime: string,
  endTime: string,
  config: GridTimeConfig = defaultGridConfig
): { left: number; width: number } {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutesFromDayStart = startH * 60 + startM;
  const endMinutesFromDayStart = endH * 60 + endM;
  
  const gridStartMinutes = config.startHour * 60;
  
  const leftMinutes = startMinutesFromDayStart - gridStartMinutes;
  const durationMinutes = endMinutesFromDayStart - startMinutesFromDayStart;
  
  return {
    left: leftMinutes * config.pixelsPerMinute,
    width: durationMinutes * config.pixelsPerMinute,
  };
}

export function getTimeSlots(config: GridTimeConfig = defaultGridConfig): string[] {
  const slots: string[] = [];
  for (let hour = config.startHour; hour < config.endHour; hour++) {
    const displayHour = hour >= 24 ? hour - 24 : hour;
    for (let minute = 0; minute < 60; minute += config.intervalMinutes) {
      slots.push(`${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

export function getHourLabels(config: GridTimeConfig = defaultGridConfig): string[] {
  const hours: string[] = [];
  for (let hour = config.startHour; hour < config.endHour; hour++) {
    const displayHour = hour >= 24 ? hour - 24 : hour;
    hours.push(`${displayHour.toString().padStart(2, '0')}:00`);
  }
  return hours;
}
