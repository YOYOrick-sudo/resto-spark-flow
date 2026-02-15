
export type FillOrderType = 'first_available' | 'round_robin' | 'priority' | 'custom';

/**
 * fill_order bepaalt hoe tafels worden toegewezen binnen een area:
 * - first_available: Eerste beschikbare tafel in sort_order
 * - round_robin: Afwisselend verdelen over tafels
 * - priority: Volgorde bepaald door assign_priority (hoog eerst)
 * - custom: Manual toewijzing, assign_priority als hint voor suggesties
 */

export interface Area {
  id: string;
  location_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  fill_order: FillOrderType;
  created_at: string;
  updated_at: string;
  tables?: Table[];
}

export interface Table {
  id: string;
  location_id: string;
  area_id: string;
  table_number: number;
  display_label: string;
  min_capacity: number;
  max_capacity: number;
  is_active: boolean;
  is_online_bookable: boolean;
  is_joinable: boolean;
  /** 0-100, hogere waarde = eerder combineren (MVP range, later uitbreidbaar) */
  join_priority: number;
  /** 0-100, hogere waarde = eerder toewijzen (MVP range, later uitbreidbaar) */
  assign_priority: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  area_name?: string;
  /** Aantal ACTIEVE groups waarin tafel zit (alleen bij includeGroupCounts) */
  group_count?: number;
}

export interface TableGroup {
  id: string;
  location_id: string;
  name: string;
  /** Read-only, berekend via trigger (alleen actieve tafels) */
  combined_min_capacity: number;
  /** Read-only, berekend via trigger: sum(max_capacity) + extra_seats */
  combined_max_capacity: number;
  /** Netto correctie voor opstelling: negatief bij verlies, positief bij bijzetten */
  extra_seats: number;
  is_active: boolean;
  is_online_bookable: boolean;
  is_system_generated: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  members?: TableGroupMember[];
}

export interface TableGroupMember {
  id: string;
  table_group_id: string;
  table_id: string;
  sort_order: number;
  table?: Table;
}

export interface ReservationSettings {
  id: string;
  location_id: string;
  allow_multi_table: boolean;
  auto_assign: boolean;
  default_duration_minutes: number;
  booking_cutoff_minutes: number;
  default_buffer_minutes: number;
  /**
   * Squeeze settings - MVP: location-wide defaults only
   * Later: override per ticket type of shift
   * Constraint: squeeze_duration <= default_duration
   */
  squeeze_enabled: boolean;
  default_squeeze_duration_minutes: number;
  waitlist_auto_invite_enabled: boolean;
  max_parallel_invites: number;
  created_at: string;
  updated_at: string;
}

// Area with nested tables
export interface AreaWithTables extends Area {
  tables: Table[];
}

// Archive RPC responses
export interface ArchiveAreaResponse {
  archived_area: boolean;
  archived_tables: number;
  message?: string;
}

export interface RestoreTableResponse {
  restored: boolean;
  display_label?: string;
  error?: 'label_conflict' | 'label_invalid';
  message?: string;
}
