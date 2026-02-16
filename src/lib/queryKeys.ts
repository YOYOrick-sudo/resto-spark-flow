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

  // ============================================
  // SIGNAL ARCHITECTURE
  // ============================================
  
  /** Signals for a location */
  signals: (locationId: string) => ['signals', locationId] as const,

  /** Signal preferences for a user at a location */
  signalPreferences: (userId: string, locationId: string) => 
    ['signal-preferences', userId, locationId] as const,

  // ============================================
  // FASE 4.4A: Tickets & Beleid
  // ============================================

  /** Tickets for a location */
  tickets: (locationId: string) => ['tickets', locationId] as const,

  /** Single ticket by ID */
  ticket: (ticketId: string) => ['ticket', ticketId] as const,

  /** Policy sets for a location */
  policySets: (locationId: string) => ['policy-sets', locationId] as const,

  /** Bookable tickets for a location on a specific date */
  bookableTickets: (locationId: string, date: string) =>
    ['bookable-tickets', locationId, date] as const,

  /** Effective shift-ticket config (merged overrides) */
  shiftTicketConfig: (shiftId: string, ticketId: string) =>
    ['shift-ticket-config', shiftId, ticketId] as const,

  /** Shift-ticket links for a specific shift */
  shiftTickets: (shiftId: string) => ['shift-tickets', shiftId] as const,

  // ============================================
  // FASE 4.5.B: Availability & Diagnostics
  // ============================================

  /** Availability check results */
  availability: (locationId: string, date: string, partySize: number, ticketId?: string) =>
    ['availability', locationId, date, partySize, ticketId] as const,

  /** Diagnose slot results (on-demand, used as mutation key reference) */
  diagnoseSlot: (locationId: string, date: string, time: string, partySize: number, ticketId: string) =>
    ['diagnose-slot', locationId, date, time, partySize, ticketId] as const,
} as const;

export type QueryKeys = typeof queryKeys;
