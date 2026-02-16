// ============================================
// Fase 4.6: Reservation Types (client-side)
// ============================================

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'option'
  | 'pending_payment'
  | 'seated'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type ReservationChannel =
  | 'widget'
  | 'operator'
  | 'phone'
  | 'google'
  | 'whatsapp'
  | 'walk_in';

export interface Reservation {
  id: string;
  location_id: string;
  customer_id: string;
  shift_id: string;
  ticket_id: string;
  table_id: string | null;
  status: ReservationStatus;
  channel: ReservationChannel;
  reservation_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  duration_minutes: number;
  is_squeeze: boolean;
  guest_notes: string | null;
  internal_notes: string | null;
  manage_token: string;
  no_show_risk_score: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: Customer;
  shift_name?: string;
  ticket_name?: string;
  table_label?: string;
}

export interface Customer {
  id: string;
  location_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  language: string;
  tags: string[];
  notes: string | null;
  total_visits: number;
  total_no_shows: number;
  total_cancellations: number;
  first_visit_at: string | null;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  location_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Client-side status transition matrix.
 * Used for UI to show valid next statuses.
 */
export const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled', 'pending_payment'],
  confirmed: ['seated', 'cancelled', 'no_show', 'option'],
  option: ['confirmed', 'cancelled', 'pending_payment'],
  pending_payment: ['confirmed', 'cancelled'],
  seated: ['completed', 'no_show'],
  completed: [],
  no_show: ['confirmed'],
  cancelled: ['confirmed'],
};
