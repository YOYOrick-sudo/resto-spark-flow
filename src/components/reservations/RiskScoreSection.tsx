import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { AlertTriangle, ShieldAlert, ShieldCheck, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Reservation } from '@/types/reservation';

interface RiskScoreSectionProps {
  reservation: Reservation;
  className?: string;
}

interface RiskFactor {
  score: number;
  weight: number;
  detail: string;
}

function getRiskLevel(score: number): { label: string; colorClass: string; icon: React.ElementType } {
  if (score >= 50) return { label: 'Hoog', colorClass: 'text-destructive', icon: ShieldAlert };
  if (score >= 30) return { label: 'Verhoogd', colorClass: 'text-warning', icon: AlertTriangle };
  return { label: 'Laag', colorClass: 'text-emerald-600 dark:text-emerald-400', icon: ShieldCheck };
}

const FACTOR_LABELS: Record<string, string> = {
  guest_history: 'Gasthistorie',
  party_size: 'Groepsgrootte',
  booking_lead: 'Boekingstermijn',
  channel: 'Kanaal',
  day_of_week: 'Dag',
};

export function RiskScoreSection({ reservation, className }: RiskScoreSectionProps) {
  const score = reservation.no_show_risk_score;
  const factors = reservation.risk_factors as Record<string, RiskFactor> | null | undefined;

  // Shift average context
  const { data: shiftRisk } = useQuery({
    queryKey: queryKeys.shiftRiskSummary(reservation.location_id, reservation.reservation_date),
    queryFn: async () => {
      const { data } = await supabase
        .from('shift_risk_summary' as any)
        .select('avg_risk_score')
        .eq('location_id', reservation.location_id)
        .eq('reservation_date', reservation.reservation_date)
        .eq('shift_id', reservation.shift_id)
        .maybeSingle();
      return data as unknown as { avg_risk_score: number } | null;
    },
    enabled: !!reservation.shift_id,
  });

  if (score === null || score === undefined) {
    return (
      <div className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Risicoscore</h3>
        <p className="text-sm text-muted-foreground italic">Risicoscore wordt berekend...</p>
      </div>
    );
  }

  const risk = getRiskLevel(score);
  const RiskIcon = risk.icon;
  const barWidth = Math.min(Math.max(score, 0), 100);

  return (
    <div className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold text-foreground mb-3">Risicoscore</h3>

      {/* Score display */}
      <div className="flex items-center gap-3 mb-3">
        <RiskIcon className={cn('h-5 w-5', risk.colorClass)} />
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', risk.colorClass)}>{Math.round(score)}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <span className={cn('text-xs font-medium ml-auto', risk.colorClass)}>{risk.label}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-muted rounded-full mt-1.5 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                score >= 50 ? 'bg-destructive' : score >= 30 ? 'bg-warning' : 'bg-emerald-500'
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      {factors && (
        <div className="space-y-2 mb-3">
          {Object.entries(factors).map(([key, factor]) => {
            if (!factor || typeof factor !== 'object') return null;
            const f = factor as RiskFactor;
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-24 flex-shrink-0">
                  {FACTOR_LABELS[key] || key}
                </span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground/30 rounded-full"
                    style={{ width: `${Math.min((f.score / f.weight) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-8 text-right font-mono">
                  {Math.round(f.score)}
                </span>
                <span className="text-muted-foreground/60 w-20 truncate" title={f.detail}>
                  {f.detail}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Shift average */}
      {shiftRisk?.avg_risk_score !== undefined && shiftRisk.avg_risk_score !== null && (
        <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
          Shift gemiddeld: <span className="font-medium text-foreground">{Math.round(shiftRisk.avg_risk_score)}%</span>
        </p>
      )}

      {/* Confirmation placeholder */}
      {score >= 50 && reservation.status === 'confirmed' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-button border border-input bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                Bevestiging sturen
              </button>
            </TooltipTrigger>
            <TooltipContent>Beschikbaar na messaging (4.14)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
