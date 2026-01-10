import { AssistantItem } from '@/types/assistant';

// Helper to create ISO timestamps relative to now
function hoursAgo(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

export const mockAssistantItems: AssistantItem[] = [
  // Error - actionable
  {
    id: 'insight-1',
    kind: 'insight',
    module: 'reserveringen',
    severity: 'error',
    title: 'Overboeking risico diner',
    message: 'Pacing ligt 18% boven zitcapaciteit voor 19:00-20:00 slot',
    created_at: hoursAgo(0.5),
    action_path: '/reserveringen',
    actionable: true,
    source_ids: ['signal-1', 'signal-2'],
  },
  // Warning - actionable
  {
    id: 'signal-1',
    kind: 'signal',
    module: 'reserveringen',
    severity: 'warning',
    title: '3 annuleringen vandaag',
    message: 'Meer dan gemiddeld voor deze dag',
    created_at: hoursAgo(1),
    action_path: '/reserveringen',
    actionable: true,
  },
  {
    id: 'insight-2',
    kind: 'insight',
    module: 'keuken',
    severity: 'warning',
    title: 'Keuken niet ready voor piek',
    message: '4 van 12 MEP-taken nog open',
    created_at: hoursAgo(2),
    action_path: '/mep',
    actionable: true,
    source_ids: ['signal-3'],
  },
  {
    id: 'signal-2',
    kind: 'signal',
    module: 'configuratie',
    severity: 'warning',
    title: '2 tafels niet in een area',
    message: 'Tafels moeten in een area staan voor reserveringen',
    created_at: hoursAgo(26),
    action_path: '/instellingen/reserveringen/tafels',
    actionable: true,
  },
  // Warning - NOT actionable (for testing toggle)
  {
    id: 'signal-3',
    kind: 'signal',
    module: 'reserveringen',
    severity: 'warning',
    title: 'Wachtlijst: 4 gasten',
    message: 'Gasten wachten op annulering',
    created_at: hoursAgo(3),
    actionable: false,
  },
  {
    id: 'signal-4',
    kind: 'signal',
    module: 'keuken',
    severity: 'warning',
    title: 'Voorraad zalm onder minimum',
    message: 'Bestel voor morgen',
    created_at: hoursAgo(5),
    actionable: false,
  },
  // Info
  {
    id: 'signal-5',
    kind: 'signal',
    module: 'revenue',
    severity: 'info',
    title: 'Omzet vandaag: €2.340',
    created_at: hoursAgo(1),
    actionable: false,
  },
  {
    id: 'insight-3',
    kind: 'insight',
    module: 'revenue',
    severity: 'info',
    title: 'Omzet 8% hoger dan vorige week',
    message: 'Positieve trend zet door',
    created_at: hoursAgo(4),
    actionable: false,
    source_ids: ['signal-5'],
  },
  // OK
  {
    id: 'signal-6',
    kind: 'signal',
    module: 'keuken',
    severity: 'ok',
    title: 'Alle MEP-taken afgerond',
    created_at: hoursAgo(0.5),
    actionable: false,
  },
  {
    id: 'signal-7',
    kind: 'signal',
    module: 'configuratie',
    severity: 'ok',
    title: 'Setup compleet',
    message: 'Alle configuratie is in orde',
    created_at: hoursAgo(48),
    actionable: false,
  },
];
