import { Lightbulb, TrendingUp, Clock, Shuffle, Trophy, AlertTriangle, X } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoButton } from '@/components/polar/NestoButton';
import { useCoachingTips, useDismissCoachingTip } from '@/hooks/useCoachingTips';

const TIP_ICON: Record<string, typeof TrendingUp> = {
  performance: TrendingUp,
  timing: Clock,
  content_mix: Shuffle,
  growth: Trophy,
  warning: AlertTriangle,
};

export function CoachingTipsCard() {
  const { data: tips, isLoading } = useCoachingTips();
  const dismiss = useDismissCoachingTip();

  if (isLoading || !tips?.length) return null;

  return (
    <NestoCard className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Tips</h3>
      </div>
      <div className="space-y-2">
        {tips.map((tip) => {
          const Icon = TIP_ICON[tip.tip_type] ?? Lightbulb;
          return (
            <div key={tip.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-accent/30">
              <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{tip.title}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
              </div>
              <NestoButton
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 w-7 p-0"
                onClick={() => dismiss.mutate(tip.id)}
                disabled={dismiss.isPending}
              >
                <X className="h-3.5 w-3.5" />
              </NestoButton>
            </div>
          );
        })}
      </div>
    </NestoCard>
  );
}
