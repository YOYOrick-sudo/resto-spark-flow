import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useMarketingFlows, useUpdateMarketingFlow } from '@/hooks/useMarketingFlows';
import { useMarketingTemplates } from '@/hooks/useMarketingTemplates';
import { nestoToast } from '@/lib/nestoToast';

const FLOW_TYPE_LABELS: Record<string, string> = {
  welcome: 'Welkom',
  birthday: 'Verjaardag',
  winback: 'Win-back',
  post_visit: 'Na bezoek',
  vip: 'VIP',
  review_request: 'Review',
  custom: 'Custom',
};

interface AutomationFlowsTabProps {
  readOnly: boolean;
}

export default function AutomationFlowsTab({ readOnly }: AutomationFlowsTabProps) {
  const { data: flows, isLoading } = useMarketingFlows();
  const { data: templates } = useMarketingTemplates();
  const updateFlow = useUpdateMarketingFlow();

  if (isLoading) return <CardSkeleton lines={6} />;

  if (!flows?.length) {
    return (
      <NestoCard className="p-6">
        <EmptyState
          title="Geen automation flows"
          description="Er zijn nog geen automation flows geconfigureerd voor deze locatie."
        />
      </NestoCard>
    );
  }

  const templateOptions = (templates ?? []).map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <NestoCard className="p-6">
      <h3 className="text-sm font-semibold mb-5">Automation Flows</h3>

      <div className="space-y-3">
        {flows.map((flow) => {
          const triggerConfig = flow.trigger_config as Record<string, any>;
          const delayDays = triggerConfig?.delay_days ?? triggerConfig?.days ?? '';
          const delayHours = triggerConfig?.delay_hours ?? triggerConfig?.hours ?? '';

          return (
            <div key={flow.id} className="bg-secondary/50 rounded-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{flow.name}</span>
                  <NestoBadge variant="default" size="sm">
                    {FLOW_TYPE_LABELS[flow.flow_type] || flow.flow_type}
                  </NestoBadge>
                  {flow.flow_type !== 'custom' && (
                    <NestoBadge variant="outline" size="sm">Systeem</NestoBadge>
                  )}
                </div>
                <Switch
                  checked={flow.is_active}
                  onCheckedChange={(checked) => {
                    if (readOnly) return;
                    updateFlow.mutate(
                      { flowId: flow.id, updates: { is_active: checked } },
                      { onError: () => nestoToast.error('Wijziging mislukt') }
                    );
                  }}
                  disabled={readOnly}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Timing */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Vertraging (dagen)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={delayDays}
                    onChange={(e) => {
                      if (readOnly) return;
                      const newConfig = { ...triggerConfig, delay_days: parseInt(e.target.value) || 0 };
                      updateFlow.mutate(
                        { flowId: flow.id, updates: { trigger_config: newConfig } },
                        { onError: () => nestoToast.error('Wijziging mislukt') }
                      );
                    }}
                    className="text-sm h-8"
                    disabled={readOnly}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Vertraging (uren)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={delayHours}
                    onChange={(e) => {
                      if (readOnly) return;
                      const newConfig = { ...triggerConfig, delay_hours: parseInt(e.target.value) || 0 };
                      updateFlow.mutate(
                        { flowId: flow.id, updates: { trigger_config: newConfig } },
                        { onError: () => nestoToast.error('Wijziging mislukt') }
                      );
                    }}
                    className="text-sm h-8"
                    disabled={readOnly}
                  />
                </div>

                {/* Template */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Template</Label>
                  <NestoSelect
                    value={flow.template_id || ''}
                    onValueChange={(v) => {
                      if (readOnly) return;
                      updateFlow.mutate(
                        { flowId: flow.id, updates: { template_id: v || null } },
                        { onError: () => nestoToast.error('Wijziging mislukt') }
                      );
                    }}
                    options={[{ value: '', label: 'Geen template' }, ...templateOptions]}
                    disabled={readOnly}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </NestoCard>
  );
}
