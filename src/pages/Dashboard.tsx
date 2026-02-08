import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { DashboardModuleTile } from '@/components/polar/DashboardModuleTile';
import { mockAssistantItems } from '@/data/assistantMockData';
import { mockReservations, mockTables } from '@/data/reservations';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const dateLabel = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

  const todayReservations = useMemo(
    () => mockReservations.filter((r) => r.date === today && r.status !== 'cancelled'),
    [today]
  );

  const totalCapacity = useMemo(
    () => mockTables.filter((t) => t.isActive).reduce((sum, t) => sum + t.maxCapacity, 0),
    []
  );

  const totalGuests = useMemo(
    () => todayReservations.reduce((sum, r) => sum + r.guests, 0),
    [todayReservations]
  );

  const occupancy = totalCapacity > 0 ? Math.round((totalGuests / totalCapacity) * 100) : 0;
  const vipCount = todayReservations.filter((r) => (r as any).isVip).length;

  const urgentCount = useMemo(
    () => mockAssistantItems.filter((i) => i.severity === 'error' || i.severity === 'warning').length,
    []
  );

  const resHero = todayReservations.length > 0 ? String(todayReservations.length) : '—';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold text-foreground">{getGreeting()}</span>
        <span className="text-sm text-muted-foreground">{dateLabel}</span>
      </div>

      {/* Urgent banner */}
      {urgentCount > 0 && (
        <Link
          to="/assistent"
          className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3"
        >
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
            {urgentCount === 1 ? '1 signaal vereist aandacht' : `${urgentCount} signalen vereisen aandacht`}
          </span>
        </Link>
      )}

      {/* Module tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 items-stretch mt-8">
        <DashboardModuleTile
          title="Reserveringen"
          heroValue={resHero}
          heroLabel="vandaag"
          secondaryMetrics={[
            { label: 'bezetting', value: `${occupancy}%` },
            { label: 'VIP', value: String(vipCount) },
          ]}
          linkTo="/reserveringen"
        />
        <DashboardModuleTile
          title="Keuken"
          heroValue="—"
          heroLabel="open taken"
          secondaryMetrics={[
            { label: 'ingrediënten', value: '12' },
            { label: 'onder minimum', value: '3' },
          ]}
          linkTo="/keuken/taken"
        />
        <DashboardModuleTile
          title="Recepten"
          heroValue="—"
          heroLabel="actief"
          linkTo="/recepten"
        />
      </div>
    </div>
  );
}
