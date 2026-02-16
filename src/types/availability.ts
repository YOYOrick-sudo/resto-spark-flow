// ============================================
// Check Availability — Request / Response
// ============================================

export interface AvailabilityRequest {
  location_id: string;
  date: string;            // YYYY-MM-DD
  party_size: number;
  ticket_id?: string | null;
  channel?: 'widget' | 'operator' | 'google' | 'whatsapp';
  overbooking_covers?: number;
}

export type ReasonCode =
  | 'shift_closed'
  | 'booking_window'
  | 'party_size'
  | 'channel_blocked'
  | 'pacing_full'
  | 'max_covers'
  | 'tables_full';

export type SlotType = 'normal' | 'squeeze';

export interface SlotResult {
  time: string;            // "HH:MM"
  available: boolean;
  slot_type: SlotType | null;
  reason_code: ReasonCode | null;
  ticket_id: string;
  ticket_name: string;
  duration_minutes: number;
}

export interface ShiftResult {
  shift_id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  slots: SlotResult[];
}

export interface AvailabilityResponse {
  shifts: ShiftResult[];
}

// ============================================
// Diagnose Slot — Request / Response
// ============================================

export interface DiagnoseRequest {
  location_id: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM
  party_size: number;
  ticket_id: string;
}

export interface ConstraintCheck {
  type: string;
  passed: boolean;
  detail?: string;
  current_value?: number;
  limit_value?: number;
  tables_checked?: number;
  tables_capacity_match?: number;
  tables_occupied?: number;
  setting_location: string;
}

export interface DiagnoseResponse {
  available: boolean;
  blocking_constraints: ConstraintCheck[];
  all_constraints: ConstraintCheck[];
  squeeze_possible: boolean;
  squeeze_duration: number | null;
}
