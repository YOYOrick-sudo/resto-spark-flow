// Centralized query keys for consistent cache invalidation
// All invalidations should use exact: false to cover all variants

export const queryKeys = {
  /** Base key for areas-with-tables queries. Variants add [includeInactive, includeGroupCounts] */
  areasWithTables: (locationId: string) => ['areas-with-tables', locationId] as const,
  
  /** Base key for table-groups queries. Variants add [includeInactive, includeMembers] */
  tableGroups: (locationId: string) => ['table-groups', locationId] as const,
  
  // ============================================
  // FASE 4.3.A: Shifts Foundation
  // ============================================
  
  /** Base key for shifts queries. Variants may add ['all'] for including inactive */
  shifts: (locationId: string) => ['shifts', locationId] as const,
  
  /** Single shift by ID */
  shift: (shiftId: string) => ['shift', shiftId] as const,
  
  /** Shift exceptions for a location. Variants may add date range */
  shiftExceptions: (locationId: string) => ['shift-exceptions', locationId] as const,
  
  /** Effective shift schedule from RPC for a specific date */
  effectiveSchedule: (locationId: string, date: string) => 
    ['effective-schedule', locationId, date] as const,
} as const;

export type QueryKeys = typeof queryKeys;
