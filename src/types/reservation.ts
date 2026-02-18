// ============================================
// Fase 4.6: Reservation Types (client-side)
// ============================================

export type ReservationStatus =
  | 'draft'
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
  customer_id: string | null;
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
  no_show_risk_score: number | null;
  risk_factors?: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  checked_in_at?: string | null;
  cancellation_reason?: string | null;
  // Future fields (nullable until their phases)
  payment_status?: string | null;
  option_expires_at?: string | null;
  reconfirmed_at?: string | null;
  badges?: Record<string, unknown> | null;
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
  draft: ['confirmed', 'cancelled', 'pending_payment', 'option'],
  pending_payment: ['confirmed', 'cancelled'],
  option: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed', 'confirmed'],
  completed: [],
  no_show: [],
  cancelled: [],
};

// --- Status visual config (migrated from mock data) ---

export const STATUS_CONFIG: Record<ReservationStatus, {
  label: string;
  dotColor: string;
  showDot: boolean;
  textClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  draft: {
    label: 'Concept',
    dotColor: '#B8B5B0',
    showDot: true,
    textClass: 'text-muted-foreground',
    bgClass: 'bg-muted/40',
    borderClass: '',
  },
  confirmed: {
    label: 'Bevestigd',
    dotColor: '#1d979e',
    showDot: true,
    textClass: 'text-primary',
    bgClass: 'bg-primary/[0.08]',
    borderClass: '',
  },
  pending_payment: {
    label: 'Wacht op betaling',
    dotColor: '#F59E0B',
    showDot: true,
    textClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: '',
  },
  option: {
    label: 'Optie',
    dotColor: '#6366F1',
    showDot: true,
    textClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: '',
  },
  seated: {
    label: 'Ingecheckt',
    dotColor: '#10B981',
    showDot: true,
    textClass: 'text-emerald-700 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderClass: '',
  },
  completed: {
    label: 'Uitgecheckt',
    dotColor: '#D1CCC7',
    showDot: true,
    textClass: 'text-muted-foreground opacity-50',
    bgClass: '',
    borderClass: '',
  },
  no_show: {
    label: 'No-show',
    dotColor: '#E87461',
    showDot: true,
    textClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border border-destructive/20',
  },
  cancelled: {
    label: 'Geannuleerd',
    dotColor: '',
    showDot: false,
    textClass: 'text-muted-foreground line-through',
    bgClass: '',
    borderClass: '',
  },
};

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  draft: 'Concept',
  pending_payment: 'Wacht op betaling',
  option: 'Optie',
  confirmed: 'Bevestigd',
  seated: 'Ingecheckt',
  completed: 'Uitgecheckt',
  no_show: 'No-show',
  cancelled: 'Geannuleerd',
};

export const CHANNEL_LABELS: Record<ReservationChannel, string> = {
  widget: 'Widget',
  operator: 'Operator',
  phone: 'Telefoon',
  google: 'Google',
  whatsapp: 'WhatsApp',
  walk_in: 'Walk-in',
};

export const CHANNEL_ICONS: Record<ReservationChannel, string> = {
  widget: 'Globe',
  operator: 'User',
  phone: 'Phone',
  google: 'Search',
  whatsapp: 'MessageCircle',
  walk_in: 'Footprints',
};
