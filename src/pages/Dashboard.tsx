import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, CheckSquare, BookOpen, Users,
  AlertTriangle, AlertCircle, ChevronRight,
} from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { mockAssistantItems } from '@/data/assistantMockData';
import { mockReservations, mockTables } from '@/data/reservations';
import type { AssistantModule } from '@/types/assistant';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityConfig: Record<'error' | 'warning', { icon: typeof AlertCircle; iconClass: string }> = {
  error: { icon: AlertCircle, iconClass: 'text-destructive' },
  warning: { icon: AlertTriangle, iconClass: 'text-warning' },
};

const moduleConfig: Record<AssistantModule, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  reserveringen: { label: 'Reserveringen', variant: 'primary' },
  keuken: { label: 'Keuken', variant: 'warning' },
  revenue: { label: 'Revenue', variant: 'success' },
  configuratie: { label: 'Configuratie', variant: 'default' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

interface DashboardStatProps {
  label: string;
  value: number;
  icon: LucideIcon;
  suffix?: string;
}

function DashboardStat({ label, value, icon: Icon, suffix }: DashboardStatProps) {
  return (
    <NestoCard className="p-4">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-2">
        {value === 0 ? (
          <span className="text-xl font-semibold text-muted-foreground">—</span>
        ) : (
          <span className="text-xl font-semibold text-foreground">{value}{suffix}</span>
        )}
      </div>
    </NestoCard>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const dateLabel = new Date().toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });

  const todayReservations = useMemo(
    () => mockReservations
      .filter((r) => r.date === today && r.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
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

  const urgentSignals = useMemo(() => {
    const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1 };
    return mockAssistantItems
      .filter((item) => item.severity === 'error' || item.severity === 'warning')
      .sort((a, b) => {
        const sd = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
        if (sd !== 0) return sd;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 2);
  }, []);

  const first4 = todayReservations.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Greeting + date */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold text-foreground">{getGreeting()}</span>
        <span className="text-sm text-muted-foreground">{dateLabel}</span>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStat label="Reserveringen vandaag" value={todayReservations.length} icon={CalendarDays} />
        <DashboardStat label="Open taken" value={0} icon={CheckSquare} />
        <DashboardStat label="Actieve recepten" value={0} icon={BookOpen} />
        <DashboardStat label="Bezetting" value={occupancy} icon={Users} suffix="%" />
      </div>

      {/* Aandacht vereist */}
      {urgentSignals.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-foreground">Aandacht vereist</span>
          </div>
          <div className="space-y-1">
            {urgentSignals.map((item) => {
              const sev = severityConfig[item.severity as 'error' | 'warning'];
              const SevIcon = sev.icon;
              const mod = moduleConfig[item.module];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => item.action_path && navigate(item.action_path)}
                >
                  <SevIcon className={cn('h-4 w-4 shrink-0', sev.iconClass)} />
                  <span className="text-sm font-medium text-foreground flex-1">{item.title}</span>
                  <NestoBadge variant={mod.variant} className="text-[10px] shrink-0">
                    {mod.label}
                  </NestoBadge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
          <Link to="/assistent" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1">
            Alle signalen bekijken <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Reserveringen vandaag */}
      <NestoCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-base font-medium">Vandaag</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{todayReservations.length}</span>
            <Link to="/reserveringen" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Bekijk alle <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {first4.length > 0 ? (
          <div className="divide-y divide-border">
            {first4.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors duration-150 cursor-pointer"
                onClick={() => navigate('/reserveringen')}
              >
                <span className="text-sm font-medium w-14 shrink-0">{r.startTime}</span>
                <span className="text-sm flex-1 truncate">
                  {r.guestFirstName} {r.guestLastName}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Geen reserveringen vandaag
          </p>
        )}
      </NestoCard>
    </div>
  );
}
