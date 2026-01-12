// ============================================
// FASE 4.3.D: Bulk Exception Generator
// Date generation utilities for recurring patterns
// ============================================

import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  getDate,
  setDate,
  isBefore,
  isAfter,
  isSameDay,
  differenceInYears,
  format,
  lastDayOfMonth,
} from 'date-fns';
import { nl } from 'date-fns/locale';

// ============================================
// Types
// ============================================

export type RepeatMode = 'weekly' | 'monthly-day' | 'monthly-nth' | 'n-occurrences';
export type NthWeek = 1 | 2 | 3 | 4 | 'last';

export interface WeeklyPattern {
  mode: 'weekly';
  weekdays: number[]; // ISO 1-7 (Monday = 1, Sunday = 7)
}

export interface MonthlyDayPattern {
  mode: 'monthly-day';
  dayOfMonth: number; // 1-31
  everyNMonths: number; // default 1
}

export interface MonthlyNthPattern {
  mode: 'monthly-nth';
  nth: NthWeek; // 1, 2, 3, 4, or 'last'
  weekday: number; // ISO 1-7
  everyNMonths: number; // default 1
}

export interface NOccurrencesPattern {
  mode: 'n-occurrences';
  count: number;
  basePattern: Omit<WeeklyPattern, 'mode'> | Omit<MonthlyDayPattern, 'mode'> | Omit<MonthlyNthPattern, 'mode'>;
  baseMode: 'weekly' | 'monthly-day' | 'monthly-nth';
}

export type GeneratorPattern =
  | WeeklyPattern
  | MonthlyDayPattern
  | MonthlyNthPattern
  | NOccurrencesPattern;

export interface GeneratorConfig {
  pattern: GeneratorPattern;
  startDate: Date;
  endDate?: Date; // Required for weekly/monthly, optional for n-occurrences
}

export interface GeneratedDate {
  date: Date;
  formattedDate: string; // YYYY-MM-DD
  displayDate: string; // Human readable
  dayOfWeek: string;
}

// ============================================
// Constants
// ============================================

export const NTH_OPTIONS: { value: NthWeek; label: string }[] = [
  { value: 1, label: '1e' },
  { value: 2, label: '2e' },
  { value: 3, label: '3e' },
  { value: 4, label: '4e' },
  { value: 'last', label: 'Laatste' },
];

export const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'maandag' },
  { value: 2, label: 'dinsdag' },
  { value: 3, label: 'woensdag' },
  { value: 4, label: 'donderdag' },
  { value: 5, label: 'vrijdag' },
  { value: 6, label: 'zaterdag' },
  { value: 7, label: 'zondag' },
];

// ============================================
// Validation
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

const MAX_DATE_RANGE_YEARS = 2;
const MAX_N_OCCURRENCES = 500;
const WARNING_THRESHOLD = 100;
const ORANGE_WARNING_THRESHOLD = 365;

export function validateGeneratorConfig(config: GeneratorConfig): ValidationResult {
  const { pattern, startDate, endDate } = config;

  // N-occurrences mode validation
  if (pattern.mode === 'n-occurrences') {
    if (pattern.count > MAX_N_OCCURRENCES) {
      return {
        valid: false,
        error: `Maximum ${MAX_N_OCCURRENCES} uitzonderingen per keer.`,
      };
    }
    if (pattern.count <= 0) {
      return {
        valid: false,
        error: 'Aantal moet groter dan 0 zijn.',
      };
    }
  } else {
    // Date range modes
    if (!endDate) {
      return {
        valid: false,
        error: 'Einddatum is verplicht.',
      };
    }

    if (isBefore(endDate, startDate)) {
      return {
        valid: false,
        error: 'Einddatum moet na startdatum liggen.',
      };
    }

    const yearsDiff = differenceInYears(endDate, startDate);
    if (yearsDiff > MAX_DATE_RANGE_YEARS) {
      return {
        valid: false,
        error: `Maximum periode is ${MAX_DATE_RANGE_YEARS} jaar.`,
      };
    }
  }

  // Weekly: at least one weekday selected
  if (pattern.mode === 'weekly' && pattern.weekdays.length === 0) {
    return {
      valid: false,
      error: 'Selecteer minimaal één weekdag.',
    };
  }

  // N-occurrences with weekly base
  if (
    pattern.mode === 'n-occurrences' &&
    pattern.baseMode === 'weekly' &&
    (pattern.basePattern as Omit<WeeklyPattern, 'mode'>).weekdays.length === 0
  ) {
    return {
      valid: false,
      error: 'Selecteer minimaal één weekdag.',
    };
  }

  return { valid: true };
}

export function getCountWarning(count: number): string | undefined {
  if (count > ORANGE_WARNING_THRESHOLD) {
    return `Let op: ${count} uitzonderingen is heel veel. Controleer of dit correct is.`;
  }
  if (count > WARNING_THRESHOLD) {
    return `Let op: Je maakt ${count} uitzonderingen aan.`;
  }
  return undefined;
}

// ============================================
// Core Generation Functions
// ============================================

/**
 * Convert JavaScript getDay() (0=Sunday) to ISO weekday (1=Monday, 7=Sunday)
 */
function jsToIsoWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Generate all dates matching weekdays within a date range
 */
export function generateDatesWeekly(
  startDate: Date,
  endDate: Date,
  weekdays: number[]
): GeneratedDate[] {
  const results: GeneratedDate[] = [];
  let current = new Date(startDate);

  while (!isAfter(current, endDate)) {
    const isoWeekday = jsToIsoWeekday(getDay(current));
    
    if (weekdays.includes(isoWeekday)) {
      results.push(createGeneratedDate(current));
    }
    
    current = addDays(current, 1);
  }

  return results;
}

/**
 * Generate dates for a specific day of month (e.g., "15th of each month")
 * Skips months where the day doesn't exist (e.g., Feb 31)
 */
export function generateDatesMonthlyDay(
  startDate: Date,
  endDate: Date,
  dayOfMonth: number,
  everyNMonths: number = 1
): GeneratedDate[] {
  const results: GeneratedDate[] = [];
  let currentMonth = startOfMonth(startDate);

  while (!isAfter(currentMonth, endDate)) {
    const targetDate = trySetDayOfMonth(currentMonth, dayOfMonth);
    
    if (
      targetDate &&
      !isBefore(targetDate, startDate) &&
      !isAfter(targetDate, endDate)
    ) {
      results.push(createGeneratedDate(targetDate));
    }
    
    currentMonth = addMonths(currentMonth, everyNMonths);
  }

  return results;
}

/**
 * Generate dates for Nth weekday of month (e.g., "last Sunday")
 */
export function generateDatesMonthlyNth(
  startDate: Date,
  endDate: Date,
  nth: NthWeek,
  weekday: number,
  everyNMonths: number = 1
): GeneratedDate[] {
  const results: GeneratedDate[] = [];
  let currentMonth = startOfMonth(startDate);

  while (!isAfter(currentMonth, endDate)) {
    const targetDate = getNthWeekdayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      nth,
      weekday
    );
    
    if (
      targetDate &&
      !isBefore(targetDate, startDate) &&
      !isAfter(targetDate, endDate)
    ) {
      results.push(createGeneratedDate(targetDate));
    }
    
    currentMonth = addMonths(currentMonth, everyNMonths);
  }

  return results;
}

/**
 * Generate exactly N occurrences from startDate based on pattern
 */
export function generateDatesNOccurrences(
  startDate: Date,
  pattern: NOccurrencesPattern
): GeneratedDate[] {
  const { count, basePattern, baseMode } = pattern;
  const results: GeneratedDate[] = [];
  
  // Use a far future end date for generation
  const farFuture = addMonths(startDate, MAX_DATE_RANGE_YEARS * 12 + 1);
  
  let allDates: GeneratedDate[];
  
  switch (baseMode) {
    case 'weekly':
      allDates = generateDatesWeekly(
        startDate,
        farFuture,
        (basePattern as Omit<WeeklyPattern, 'mode'>).weekdays
      );
      break;
    case 'monthly-day':
      allDates = generateDatesMonthlyDay(
        startDate,
        farFuture,
        (basePattern as Omit<MonthlyDayPattern, 'mode'>).dayOfMonth,
        (basePattern as Omit<MonthlyDayPattern, 'mode'>).everyNMonths
      );
      break;
    case 'monthly-nth':
      allDates = generateDatesMonthlyNth(
        startDate,
        farFuture,
        (basePattern as Omit<MonthlyNthPattern, 'mode'>).nth,
        (basePattern as Omit<MonthlyNthPattern, 'mode'>).weekday,
        (basePattern as Omit<MonthlyNthPattern, 'mode'>).everyNMonths
      );
      break;
    default:
      allDates = [];
  }
  
  // Take only the first N
  return allDates.slice(0, count);
}

/**
 * Main entry point: generate dates based on any pattern config
 */
export function generateDates(config: GeneratorConfig): GeneratedDate[] {
  const { pattern, startDate, endDate } = config;

  switch (pattern.mode) {
    case 'weekly':
      return generateDatesWeekly(startDate, endDate!, pattern.weekdays);
      
    case 'monthly-day':
      return generateDatesMonthlyDay(
        startDate,
        endDate!,
        pattern.dayOfMonth,
        pattern.everyNMonths
      );
      
    case 'monthly-nth':
      return generateDatesMonthlyNth(
        startDate,
        endDate!,
        pattern.nth,
        pattern.weekday,
        pattern.everyNMonths
      );
      
    case 'n-occurrences':
      return generateDatesNOccurrences(startDate, pattern);
      
    default:
      return [];
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the Nth weekday of a specific month
 * @param year Full year (e.g., 2026)
 * @param month 0-indexed month (0 = January)
 * @param nth 1-4 or 'last'
 * @param weekday ISO weekday (1 = Monday, 7 = Sunday)
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number,
  nth: NthWeek,
  weekday: number
): Date | null {
  if (nth === 'last') {
    // Find last occurrence
    const lastDay = lastDayOfMonth(new Date(year, month, 1));
    let current = lastDay;
    
    while (current.getMonth() === month) {
      if (jsToIsoWeekday(getDay(current)) === weekday) {
        return current;
      }
      current = addDays(current, -1);
    }
    return null;
  } else {
    // Find Nth occurrence
    const firstOfMonth = new Date(year, month, 1);
    let count = 0;
    let current = firstOfMonth;
    
    while (current.getMonth() === month) {
      if (jsToIsoWeekday(getDay(current)) === weekday) {
        count++;
        if (count === nth) {
          return current;
        }
      }
      current = addDays(current, 1);
    }
    return null;
  }
}

/**
 * Try to set a specific day of month, returning null if impossible
 */
function trySetDayOfMonth(monthStart: Date, day: number): Date | null {
  const lastDay = getDate(lastDayOfMonth(monthStart));
  
  if (day > lastDay) {
    return null; // Day doesn't exist in this month (e.g., Feb 31)
  }
  
  return setDate(monthStart, day);
}

/**
 * Create a GeneratedDate object from a Date
 */
function createGeneratedDate(date: Date): GeneratedDate {
  return {
    date,
    formattedDate: format(date, 'yyyy-MM-dd'),
    displayDate: format(date, 'd MMMM yyyy', { locale: nl }),
    dayOfWeek: format(date, 'EEEE', { locale: nl }),
  };
}

// ============================================
// Pattern Description Helpers
// ============================================

export function getPatternDescription(pattern: GeneratorPattern): string {
  switch (pattern.mode) {
    case 'weekly': {
      const days = pattern.weekdays
        .map((d) => WEEKDAY_OPTIONS.find((w) => w.value === d)?.label)
        .filter(Boolean)
        .join(', ');
      return `Elke ${days}`;
    }
    case 'monthly-day':
      return `Dag ${pattern.dayOfMonth} van elke ${
        pattern.everyNMonths === 1 ? 'maand' : `${pattern.everyNMonths} maanden`
      }`;
    case 'monthly-nth': {
      const nthLabel = NTH_OPTIONS.find((n) => n.value === pattern.nth)?.label || '';
      const dayLabel = WEEKDAY_OPTIONS.find((w) => w.value === pattern.weekday)?.label || '';
      return `${nthLabel} ${dayLabel} van elke ${
        pattern.everyNMonths === 1 ? 'maand' : `${pattern.everyNMonths} maanden`
      }`;
    }
    case 'n-occurrences':
      return `${pattern.count} keer`;
    default:
      return '';
  }
}
