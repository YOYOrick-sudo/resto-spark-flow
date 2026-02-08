import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { ReservationsTile } from '@/components/dashboard/ReservationsTile';
import { KeukenTile } from '@/components/dashboard/KeukenTile';
import { ReceptenTile } from '@/components/dashboard/ReceptenTile';
import { mockAssistantItems } from '@/data/assistantMockData';
import { mockReservations } from '@/data/reservations';

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

  const urgentCount = useMemo(
    () => mockAssistantItems.filter((i) => i.severity === 'error' || i.severity === 'warning').length,
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold text-foreground">{getGreeting()}</span>
        <span className="text-sm text-muted-foreground">{dateLabel}</span>
      </div>

      {urgentCount > 0 && (
        <div className="flex items-center justify-between gap-2 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg py-2 px-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
              {urgentCount === 1 ? '1 signaal vereist aandacht' : `${urgentCount} signalen vereisen aandacht`}
            </span>
          </div>
          <Link to="/assistent" className="inline-flex items-center gap-0.5 text-sm text-orange-700 dark:text-orange-300 hover:underline shrink-0">
            Bekijken <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 items-stretch mt-8">
        <ReservationsTile todayCount={todayReservations.length} />
        <KeukenTile />
        <ReceptenTile />
      </div>
    </div>
  );
}
