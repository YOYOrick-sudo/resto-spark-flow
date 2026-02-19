// ============================================
// Fase 4.7a: Pure reservation utilities
// Extracted from data/reservations.ts — no data dependencies
// ============================================

import type { Reservation } from '@/types/reservation';

// --- Grid Time Config ---

export interface GridTimeConfig {
  startHour: number;   // e.g., 13 for 13:00
  endHour: number;     // e.g., 25 for 01:00 next day (24 + 1)
  intervalMinutes: number; // e.g., 15
  pixelsPerMinute: number; // e.g., 2
}

export const defaultGridConfig: GridTimeConfig = {
  startHour: 13,
  endHour: 25,
  intervalMinutes: 15,
  pixelsPerMinute: 2,
};

// --- Time Helpers ---

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const displayHour = hours >= 24 ? hours - 24 : hours;
  return `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// --- Grid Helpers ---

export function getHourLabels(config: GridTimeConfig = defaultGridConfig): string[] {
  const hours: string[] = [];
  for (let hour = config.startHour; hour < config.endHour; hour++) {
    const displayHour = hour >= 24 ? hour - 24 : hour;
    hours.push(`${displayHour.toString().padStart(2, '0')}:00`);
  }
  return hours;
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

// --- Display Helpers ---

export function getDisplayName(r: Reservation): string {
  if (r.channel === 'walk_in' && !r.customer) return 'Walk-in';
  if (!r.customer) return 'Onbekende gast';
  return [r.customer.first_name, r.customer.last_name].filter(Boolean).join(' ') || 'Onbekende gast';
}

export function getTableLabel(r: Reservation): string {
  return r.table_label || '—';
}

/** Strip seconds from HH:MM:SS → HH:MM */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function isWalkIn(r: Reservation): boolean {
  return r.channel === 'walk_in';
}

// --- Seated count (pure — pass reservations in, no internal data) ---

export function getSeatedCountAtTime(
  reservations: Reservation[],
  time: string
): number {
  const checkTimeMinutes = timeToMinutes(time);

  return reservations
    .filter(r => {
      if (r.status === 'cancelled' || r.status === 'no_show') return false;
      const startMinutes = timeToMinutes(r.start_time);
      const endMinutes = timeToMinutes(r.end_time);
      return checkTimeMinutes >= startMinutes && checkTimeMinutes < endMinutes;
    })
    .reduce((sum, r) => sum + r.party_size, 0);
}

// --- Ticket abbreviation ---

export function getTicketAbbreviation(ticketName: string | undefined | null): string {
  if (!ticketName) return '';
  const words = ticketName.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.map(w => w[0]).join('').slice(0, 3).toUpperCase();
}

// --- Conflict check (pure) ---

export function checkTimeConflict(
  reservations: Reservation[],
  tableId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): { hasConflict: boolean; conflictingReservation?: Reservation } {
  const tableReservations = reservations
    .filter(r => r.table_id === tableId)
    .filter(r => r.id !== excludeId)
    .filter(r => r.status !== 'cancelled' && r.status !== 'no_show');

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  for (const res of tableReservations) {
    const resStart = timeToMinutes(res.start_time);
    const resEnd = timeToMinutes(res.end_time);
    if (startMinutes < resEnd && endMinutes > resStart) {
      return { hasConflict: true, conflictingReservation: res };
    }
  }

  return { hasConflict: false };
}
