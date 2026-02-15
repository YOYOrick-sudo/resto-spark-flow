
// ============================================
// Enums & Constants
// ============================================

export const TICKET_TYPES = ['regular', 'default', 'event'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = ['active', 'draft', 'archived'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PAYMENT_TYPES = ['none', 'deposit', 'full_prepay', 'no_show_guarantee'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const CANCEL_POLICY_TYPES = ['free', 'window', 'no_cancel'] as const;
export type CancelPolicyType = (typeof CANCEL_POLICY_TYPES)[number];

export const REFUND_TYPES = ['full', 'partial', 'none'] as const;
export type RefundType = (typeof REFUND_TYPES)[number];

export const NOSHOW_POLICY_TYPES = ['none', 'mark_only', 'charge'] as const;
export type NoshowPolicyType = (typeof NOSHOW_POLICY_TYPES)[number];

// ============================================
// Database Row Types
// ============================================

export interface Ticket {
  id: string;
  location_id: string;
  policy_set_id: string | null;
  name: string;
  display_title: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  color: string;
  ticket_type: TicketType;
  is_default: boolean;
  status: TicketStatus;
  is_highlighted: boolean;
  highlight_order: number | null;
  sort_order: number;
  min_party_size: number;
  max_party_size: number;
  duration_minutes: number;
  buffer_minutes: number;
  booking_window_min_minutes: number | null;
  booking_window_max_days: number | null;
  large_party_threshold: number | null;
  large_party_min_minutes: number | null;
  friend_url_token: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PolicySet {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
  payment_type: PaymentType;
  payment_amount_cents: number | null;
  show_full_price: boolean;
  full_price_cents: number | null;
  show_discount_price: boolean;
  discount_original_cents: number | null;
  absorb_transaction_fee: boolean;
  cancel_policy_type: CancelPolicyType;
  cancel_window_hours: number | null;
  cancel_cutoff_time: string | null;
  refund_type: RefundType;
  refund_percentage: number | null;
  noshow_policy_type: NoshowPolicyType;
  noshow_mark_after_minutes: number | null;
  noshow_charge_amount_cents: number | null;
  reconfirm_enabled: boolean;
  reconfirm_hours_before: number | null;
  reconfirm_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftTicket {
  id: string;
  shift_id: string;
  ticket_id: string;
  location_id: string;
  override_duration_minutes: number | null;
  override_buffer_minutes: number | null;
  override_min_party: number | null;
  override_max_party: number | null;
  pacing_limit: number | null;
  seating_limit_guests: number | null;
  seating_limit_reservations: number | null;
  ignore_pacing: boolean;
  areas: string[] | null;
  show_area_name: boolean;
  area_display_names: Record<string, string> | null;
  squeeze_enabled: boolean;
  squeeze_duration_minutes: number | null;
  squeeze_gap_minutes: number | null;
  squeeze_to_fixed_end_time: string | null;
  squeeze_limit_per_shift: number | null;
  show_end_time: boolean;
  waitlist_enabled: boolean;
  channel_permissions: { widget: boolean; phone: boolean; google?: boolean };
  is_active: boolean;
  created_at: string;
}

// ============================================
// RPC Result Types
// ============================================

/** Result from get_bookable_tickets RPC */
export interface BookableTicket {
  id: string;
  name: string;
  display_title: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  color: string;
  ticket_type: TicketType;
  is_default: boolean;
  is_highlighted: boolean;
  highlight_order: number | null;
  sort_order: number;
  min_party_size: number;
  max_party_size: number;
  duration_minutes: number;
  buffer_minutes: number;
  policy_set_id: string | null;
  friend_url_token: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

/** Result from get_shift_ticket_config RPC — merged effective config */
export interface ShiftTicketConfig {
  shift_id: string;
  ticket_id: string;
  ticket_name: string;
  display_title: string;
  duration_minutes: number;
  buffer_minutes: number;
  min_party_size: number;
  max_party_size: number;
  pacing_limit: number | null;
  seating_limit_guests: number | null;
  seating_limit_reservations: number | null;
  ignore_pacing: boolean;
  areas: string[] | null;
  show_area_name: boolean;
  area_display_names: Record<string, string> | null;
  squeeze_enabled: boolean;
  squeeze_duration_minutes: number | null;
  squeeze_gap_minutes: number | null;
  squeeze_to_fixed_end_time: string | null;
  squeeze_limit_per_shift: number | null;
  show_end_time: boolean;
  waitlist_enabled: boolean;
  channel_permissions: { widget: boolean; phone: boolean; google?: boolean };
  policy_set_id: string | null;
}

/** Result from get_ticket_with_policy RPC */
export interface TicketWithPolicy {
  ticket: Ticket;
  policy_set: PolicySet | null;
}

// ============================================
// Input Types for Mutations
// ============================================

export interface CreateTicketInput {
  location_id: string;
  name: string;
  display_title: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  color?: string;
  ticket_type?: TicketType;
  status?: TicketStatus;
  min_party_size?: number;
  max_party_size?: number;
  duration_minutes?: number;
  buffer_minutes?: number;
  policy_set_id?: string | null;
  booking_window_min_minutes?: number | null;
  booking_window_max_days?: number | null;
  large_party_threshold?: number | null;
  large_party_min_minutes?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTicketInput {
  id: string;
  name?: string;
  display_title?: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  color?: string;
  ticket_type?: TicketType;
  status?: TicketStatus;
  is_highlighted?: boolean;
  highlight_order?: number | null;
  min_party_size?: number;
  max_party_size?: number;
  duration_minutes?: number;
  buffer_minutes?: number;
  policy_set_id?: string | null;
  booking_window_min_minutes?: number | null;
  booking_window_max_days?: number | null;
  large_party_threshold?: number | null;
  large_party_min_minutes?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreatePolicySetInput {
  location_id: string;
  name: string;
  description?: string | null;
  payment_type?: PaymentType;
  payment_amount_cents?: number | null;
  cancel_policy_type?: CancelPolicyType;
  cancel_window_hours?: number | null;
  refund_type?: RefundType;
  noshow_policy_type?: NoshowPolicyType;
  noshow_mark_after_minutes?: number | null;
}

export interface UpdatePolicySetInput {
  id: string;
  name?: string;
  description?: string | null;
  payment_type?: PaymentType;
  payment_amount_cents?: number | null;
  show_full_price?: boolean;
  full_price_cents?: number | null;
  show_discount_price?: boolean;
  discount_original_cents?: number | null;
  absorb_transaction_fee?: boolean;
  cancel_policy_type?: CancelPolicyType;
  cancel_window_hours?: number | null;
  cancel_cutoff_time?: string | null;
  refund_type?: RefundType;
  refund_percentage?: number | null;
  noshow_policy_type?: NoshowPolicyType;
  noshow_mark_after_minutes?: number | null;
  noshow_charge_amount_cents?: number | null;
  reconfirm_enabled?: boolean;
  reconfirm_hours_before?: number | null;
  reconfirm_required?: boolean;
  is_active?: boolean;
}
