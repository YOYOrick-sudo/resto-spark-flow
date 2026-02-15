
/**
 * Shift exception type enum - matches database enum
 */
export type ShiftExceptionType = 'closed' | 'modified' | 'special';

/**
 * Shift database row
 */
export interface Shift {
  id: string;
  location_id: string;
  name: string;
  short_name: string;
  start_time: string;           // "HH:MM:SS" format from Postgres TIME
  end_time: string;             // "HH:MM:SS" format
  days_of_week: number[];       // ISO weekdays: 1=Monday, 7=Sunday
  arrival_interval_minutes: 15 | 30 | 60;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Shift exception database row
 * shift_id = null means location-wide exception
 */
export interface ShiftException {
  id: string;
  location_id: string;
  shift_id: string | null;      // null = location-wide exception
  exception_date: string;       // "YYYY-MM-DD" format
  exception_type: ShiftExceptionType;
  override_start_time: string | null;
  override_end_time: string | null;
  label: string | null;
  notes: string | null;
  created_at: string;
  // Optional joined data
  shift?: Shift;
}

/**
 * Status returned by get_effective_shift_schedule RPC
 */
export type EffectiveShiftStatus = 'active' | 'closed' | 'modified' | 'special';

/**
 * Row returned by get_effective_shift_schedule RPC
 */
export interface EffectiveShiftSchedule {
  shift_id: string;
  shift_name: string;
  short_name: string;
  start_time: string;
  end_time: string;
  arrival_interval_minutes: number;
  color: string;
  status: EffectiveShiftStatus;
  exception_label: string | null;
}

// ============================================
// Day of Week Helpers (ISO: 1=Monday, 7=Sunday)
// ============================================

/**
 * Short day labels (Dutch)
 */
export const DAY_LABELS: Record<number, string> = {
  1: 'Ma',
  2: 'Di',
  3: 'Wo',
  4: 'Do',
  5: 'Vr',
  6: 'Za',
  7: 'Zo',
};

/**
 * Full day labels (Dutch)
 */
export const DAY_LABELS_FULL: Record<number, string> = {
  1: 'Maandag',
  2: 'Dinsdag',
  3: 'Woensdag',
  4: 'Donderdag',
  5: 'Vrijdag',
  6: 'Zaterdag',
  7: 'Zondag',
};

/**
 * All weekdays in ISO order
 */
export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * Arrival interval options
 */
export const ARRIVAL_INTERVALS = [15, 30, 60] as const;
export type ArrivalInterval = (typeof ARRIVAL_INTERVALS)[number];

// ============================================
// Input Types for Mutations
// ============================================

export interface CreateShiftInput {
  location_id: string;
  name: string;
  short_name: string;
  start_time: string;
  end_time: string;
  days_of_week?: number[];
  arrival_interval_minutes?: 15 | 30 | 60;
  color?: string;
  sort_order?: number;
}

export interface UpdateShiftInput {
  id: string;
  name?: string;
  short_name?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  arrival_interval_minutes?: 15 | 30 | 60;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateShiftExceptionInput {
  location_id: string;
  shift_id?: string | null;
  exception_date: string;
  exception_type: ShiftExceptionType;
  override_start_time?: string | null;
  override_end_time?: string | null;
  label?: string | null;
  notes?: string | null;
}

export interface UpdateShiftExceptionInput {
  id: string;
  exception_type?: ShiftExceptionType;
  override_start_time?: string | null;
  override_end_time?: string | null;
  label?: string | null;
  notes?: string | null;
}
