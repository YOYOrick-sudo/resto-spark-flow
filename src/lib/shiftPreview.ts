import { DAY_LABELS } from "@/types/shifts";

/** Returns ISO weekday labels (1=Ma, 7=Zo) */
export function getIsoWeekdayLabels(): Record<number, string> {
  return DAY_LABELS;
}

/** Converts "HH:MM" or "HH:MM:SS" to minutes since midnight */
export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/** Formats "HH:MM:SS" or "HH:MM" to display "HH:MM" */
export function formatTimeDisplay(time: string): string {
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/** Converts minutes to "HH:MM" string */
function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** 
 * Generates time slots from start to end (exclusive)
 * Last slot is strictly < end_time
 * Example: 12:00-15:00 with 15min → [12:00, 12:15, ..., 14:45]
 */
export function generateTimeSlots(
  startTime: string, 
  endTime: string, 
  intervalMinutes: number
): string[] {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const slots: string[] = [];
  
  let current = startMinutes;
  while (current < endMinutes) {
    slots.push(formatMinutesToTime(current));
    current += intervalMinutes;
  }
  
  return slots;
}

/**
 * Gets the default active day for a shift
 * Returns today if available, otherwise next available day
 */
export function getDefaultActiveDay(daysOfWeek: number[]): number {
  if (daysOfWeek.length === 0) return 1;
  
  // JS: getDay() = 0=Sunday, 1=Monday...6=Saturday
  // ISO: 1=Monday...7=Sunday
  const jsDay = new Date().getDay();
  const isoToday = jsDay === 0 ? 7 : jsDay;
  
  if (daysOfWeek.includes(isoToday)) {
    return isoToday;
  }
  
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  return sorted.find(d => d > isoToday) ?? sorted[0];
}
