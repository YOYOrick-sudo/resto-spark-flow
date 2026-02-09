// ============================================
// SIGNAL ARCHITECTURE: Frontend Types
// ============================================

/** Module identifiers for signals - extensible via string */
export type SignalModule = 'reserveringen' | 'keuken' | 'revenue' | 'configuratie' | 'onboarding' | (string & {});

export type SignalSeverity = 'info' | 'warning' | 'error' | 'ok';
export type SignalKind = 'signal' | 'insight';
export type SignalStatus = 'active' | 'resolved' | 'dismissed';

/** Maps 1:1 to the signals database table */
export interface Signal {
  id: string;
  organization_id: string;
  location_id: string;
  module: SignalModule;
  signal_type: string;
  kind: SignalKind;
  severity: SignalSeverity;
  title: string;
  message: string | null;
  action_path: string | null;
  payload: Record<string, unknown>;
  dedup_key: string;
  cooldown_until: string | null;
  status: SignalStatus;
  source_signal_ids: string[] | null;
  actionable: boolean;
  priority: number;
  created_at: string;
  resolved_at: string | null;
  dismissed_by: string | null;
  dismissed_at: string | null;
}

/** Module display configuration */
export interface SignalModuleConfig {
  value: SignalModule | 'all';
  label: string;
  variant: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

/** Maps signal modules to entitlement module_keys */
export const SIGNAL_MODULE_TO_ENTITLEMENT: Record<string, string> = {
  reserveringen: 'reservations',
  keuken: 'kitchen',
  revenue: 'finance',
  configuratie: 'settings',
  onboarding: 'onboarding',
};

/** Module display configs */
export const SIGNAL_MODULE_CONFIGS: SignalModuleConfig[] = [
  { value: 'all', label: 'Alle', variant: 'default' },
  { value: 'reserveringen', label: 'Reserveringen', variant: 'primary' },
  { value: 'keuken', label: 'Keuken', variant: 'warning' },
  { value: 'revenue', label: 'Revenue', variant: 'success' },
  { value: 'configuratie', label: 'Configuratie', variant: 'default' },
  { value: 'onboarding', label: 'Onboarding', variant: 'primary' },
];
