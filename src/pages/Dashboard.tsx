import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, CheckSquare, BookOpen, Users,
  AlertTriangle, AlertCircle, ChevronRight,
} from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { mockAssistantItems } from '@/data/assistantMockData';
import { mockReservations, mockTables, reservationStatusConfig } from '@/data/reservations';
import type { AssistantItem, AssistantModule, AssistantSeverity } from '@/types/assistant';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Severity & Module configs (reused from AssistantItemCard) ---

const severityConfig: Record<'error' | 'warning', { icon: typeof AlertCircle; iconClass: string; bgClass: string }> = {
  error: { icon: AlertCircle, iconClass: 'text-destructive', bgClass: 'bg-destructive/10' },
  warning: { icon: AlertTriangle, iconClass: 'text-warning', bgClass: 'bg-warning/10' },
};

const moduleConfig: Record<AssistantModule, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  reserveringen: { label: 'Reserveringen', variant: 'primary' },
  keuken: { label: 'Keuken', variant: 'warning' },
  revenue: { label: 'Revenue', variant: 'success' },
  configuratie: { label: 'Configuratie', variant: 'default' },
};

// --- Stat Card ---

interface DashboardStatProps {
  label: string;
  value: number;
  icon: LucideIcon;
  zeroLabel: string;
  subLabel: string;
  suffix?: string;
}

function DashboardStat({ label, value, icon: Icon, zeroLabel, subLabel, suffix }: DashboardStatProps) {
  const isEmpty = value === 0;
  return (
    <NestoCard className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-3">
        {isEmpty ? (
          <>
            <span className="text-2xl font-semibold text-muted-foreground">—</span>
            <p className="text-xs text-muted-foreground mt-1">{zeroLabel}</p>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold text-foreground">
              {value}{suffix}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>
          </>
        )}
      </div>
    </NestoCard>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

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

  // Urgent signals
  const urgentSignals = useMemo(() => {
    const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1 };
    return mockAssistantItems
      .filter((item) => item.severity === 'error' || item.severity === 'warning')
      .sort((a, b) => {
        const sd = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
        if (sd !== 0) return sd;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 3);
  }, []);

  const first5 = todayReservations.slice(0, 5);

  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>

      {/* 1. Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStat label="Reserveringen vandaag" value={todayReservations.length} icon={CalendarDays} zeroLabel="Geen reserveringen" subLabel="vandaag" />
        <DashboardStat label="Open taken" value={0} icon={CheckSquare} zeroLabel="Geen open taken" subLabel="open" />
        <DashboardStat label="Actieve recepten" value={0} icon={BookOpen} zeroLabel="Geen actieve recepten" subLabel="actief" />
        <DashboardStat label="Bezetting" value={occupancy} icon={Users} zeroLabel="Geen data" subLabel="%" suffix="%" />
      </div>

      {/* 2. Aandacht vereist */}
      {urgentSignals.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-foreground">Aandacht vereist</span>
          </div>
          <div className="divide-y divide-border">
            {urgentSignals.map((item) => {
              const sev = severityConfig[item.severity as 'error' | 'warning'];
              const SevIcon = sev.icon;
              const mod = moduleConfig[item.module];
              const isClickable = Boolean(item.action_path);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 py-3 px-3 rounded-lg transition-colors',
                    isClickable && 'cursor-pointer hover:bg-muted/30'
                  )}
                  onClick={isClickable ? () => navigate(item.action_path!) : undefined}
                >
                  <div className={cn('flex items-center justify-center w-8 h-8 rounded-full shrink-0', sev.bgClass)}>
                    <SevIcon className={cn('h-4 w-4', sev.iconClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    {item.message && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.message}</p>
                    )}
                  </div>
                  <NestoBadge variant={mod.variant} className="text-[10px] shrink-0">
                    {mod.label}
                  </NestoBadge>
                  {isClickable && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              );
            })}
          </div>
          <Link to="/assistent" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1">
            Alle signalen bekijken <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* 3. Reserveringen vandaag */}
      <NestoCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-base font-medium">Reserveringen vandaag</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{todayReservations.length}</span>
            <Link to="/reserveringen" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Bekijk alle <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {first5.length > 0 ? (
          <div className="divide-y divide-border">
            {first5.map((r) => {
              const statusCfg = reservationStatusConfig[r.status];
              const tableNum = mockTables.find((t) => t.id === r.tableIds[0])?.number;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors duration-150 cursor-pointer"
                  onClick={() => navigate('/reserveringen')}
                >
                  <span className="text-sm font-medium w-14 shrink-0">{r.startTime}</span>
                  <span className="text-sm flex-1 truncate">
                    {r.guestFirstName} {r.guestLastName}
                  </span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {r.guests}p{tableNum ? ` · T${tableNum}` : ''}
                  </span>
                  {statusCfg.showDot && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: statusCfg.dotColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Geen reserveringen vandaag
          </p>
        )}
      </NestoCard>
    </div>
  );
}
