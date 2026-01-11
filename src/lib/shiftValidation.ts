// ============================================
// FASE 4.3.B: Shift Validation Utilities
// Enterprise overlap checking for shifts
// ============================================

import type { Shift } from "@/types/shifts";

export interface OverlapConflict {
  day: number;
  conflictingShift: Shift;
}

export interface OverlapResult {
  hasOverlap: boolean;
  conflicts: OverlapConflict[];
}

/**
 * Convert time string to minutes since midnight.
 * Robustly handles both "HH:MM" and "HH:MM:SS" formats.
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  // Ignore seconds if present
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap.
 * Ranges are [start, end) - start inclusive, end exclusive.
 */
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const t1Start = timeToMinutes(start1);
  const t1End = timeToMinutes(end1);
  const t2Start = timeToMinutes(start2);
  const t2End = timeToMinutes(end2);

  // Overlap: start1 < end2 AND start2 < end1
  return t1Start < t2End && t2Start < t1End;
}

/**
 * Check if a new/edited shift overlaps with existing active shifts.
 * 
 * Two shifts overlap if:
 * 1. They share at least one day (intersection of days_of_week)
 * 2. Their time ranges intersect
 * 3. Both are active
 * 
 * @param newShift - The shift data being validated
 * @param existingShifts - All shifts for the location
 * @param excludeShiftId - Optional shift ID to exclude (when editing)
 * @returns OverlapResult with hasOverlap boolean and conflict details
 */
export function checkShiftOverlap(
  newShift: {
    start_time: string;
    end_time: string;
    days_of_week: number[];
  },
  existingShifts: Shift[],
  excludeShiftId?: string
): OverlapResult {
  const conflicts: OverlapConflict[] = [];

  for (const existing of existingShifts) {
    // Skip self when editing
    if (excludeShiftId && existing.id === excludeShiftId) continue;
    // Only check active shifts
    if (!existing.is_active) continue;

    // Find overlapping days (ISO weekdays: 1=Monday, 7=Sunday)
    const sharedDays = newShift.days_of_week.filter((d) =>
      existing.days_of_week.includes(d)
    );

    if (sharedDays.length === 0) continue;

    // Check time overlap
    if (
      timeRangesOverlap(
        newShift.start_time,
        newShift.end_time,
        existing.start_time,
        existing.end_time
      )
    ) {
      for (const day of sharedDays) {
        conflicts.push({ day, conflictingShift: existing });
      }
    }
  }

  return { hasOverlap: conflicts.length > 0, conflicts };
}

/**
 * Format an overlap error message for UI display.
 */
export function formatOverlapError(conflicts: OverlapConflict[]): string {
  const uniqueNames = [...new Set(conflicts.map((c) => c.conflictingShift.name))];
  return `Overlap met bestaande shift(s): ${uniqueNames.join(", ")}. Pas de tijden of dagen aan.`;
}
