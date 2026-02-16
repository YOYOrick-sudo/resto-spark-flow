import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { ReservationsTile } from '@/components/dashboard/ReservationsTile';
import { KeukenTile } from '@/components/dashboard/KeukenTile';
import { ReceptenTile } from '@/components/dashboard/ReceptenTile';
import { useSignals } from '@/hooks/useSignals';
import { useReservations } from '@/hooks/useReservations';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const dateLabel = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const { signals } = useSignals();

  const { data: reservations } = useReservations({ date: today });

  const todayCount = useMemo(
    () => (reservations ?? []).filter((r) => r.status !== 'cancelled').length,
    [reservations]
  );

  const urgentCount = useMemo(
    () => signals.filter((i) => i.severity === 'error' || i.severity === 'warning').length,
    [signals]
  );

  return (
    <div className="space-y-4">
      <PageHeader title={getGreeting()} subtitle={dateLabel} />

      {urgentCount > 0 && (
        <div className="flex items-center justify-between gap-2 bg-warning/5 dark:bg-warning/10 border border-warning/30 dark:border-warning/40 rounded-lg py-2 px-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span className="text-sm font-medium text-warning">
              {urgentCount === 1 ? '1 signaal vereist aandacht' : `${urgentCount} signalen vereisen aandacht`}
            </span>
          </div>
          <Link to="/assistent" className="inline-flex items-center gap-0.5 text-sm text-warning hover:underline shrink-0">
            Bekijken <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch mt-8">
        <ReservationsTile todayCount={todayCount} />
        <KeukenTile />
        <ReceptenTile />
      </div>
    </div>
  );
}
