import { useEffect, useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { SettingsSectionLayout } from '@/components/settings/SettingsSectionLayout';
import { buildBreadcrumbs } from '@/lib/settingsRouteConfig';
import { NestoCard } from '@/components/polar/NestoCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useWaitlistSettings, useUpdateWaitlistSettings, type WaitlistSettings } from '@/hooks/useWaitlistSettings';

export default function SettingsReserveringenWachtlijst() {
  const breadcrumbs = buildBreadcrumbs('reserveringen', 'wachtlijst');
  const { data: settings, isLoading } = useWaitlistSettings();
  const update = useUpdateWaitlistSettings();

  const [local, setLocal] = useState<WaitlistSettings | null>(null);

  useEffect(() => {
    if (settings && !local) setLocal(settings);
  }, [settings, local]);

  const handleToggle = (key: keyof WaitlistSettings, value: boolean) => {
    if (!local) return;
    const next = { ...local, [key]: value };
    setLocal(next);
    update.mutate({ [key]: value });
  };

  const handleNumber = (key: keyof WaitlistSettings, value: number) => {
    if (!local) return;
    const next = { ...local, [key]: value };
    setLocal(next);
  };

  const handleNumberBlur = (key: keyof WaitlistSettings) => {
    if (!local) return;
    update.mutate({ [key]: local[key] });
  };

  const handlePriorityMode = (mode: string) => {
    if (!local) return;
    const next = { ...local, priority_mode: mode };
    setLocal(next);
    update.mutate({ priority_mode: mode });
  };

  if (isLoading || !local) {
    return (
      <SettingsSectionLayout breadcrumbs={breadcrumbs} title="Wachtlijst" icon={ListOrdered}>
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </SettingsSectionLayout>
    );
  }

  return (
    <SettingsSectionLayout breadcrumbs={breadcrumbs} title="Wachtlijst" icon={ListOrdered}>
      <div className="space-y-8 max-w-2xl">
        {/* Main toggle */}
        <NestoCard>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Wachtlijst inschakelen</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gasten kunnen zich op de wachtlijst zetten als er geen beschikbaarheid is.
                </p>
              </div>
              <Switch
                checked={local.waitlist_enabled}
                onCheckedChange={(v) => handleToggle('waitlist_enabled', v)}
              />
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Automatisch uitnodigen</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bij een annulering wordt automatisch de best passende wachtlijst-gast uitgenodigd.
                  </p>
                </div>
                <Switch
                  checked={local.auto_invite_enabled}
                  onCheckedChange={(v) => handleToggle('auto_invite_enabled', v)}
                  disabled={!local.waitlist_enabled}
                />
              </div>
            </div>
          </div>
        </NestoCard>

        {/* Configuration */}
        {local.waitlist_enabled && (
          <NestoCard>
            <div className="p-6 space-y-6">
              <h3 className="text-sm font-semibold text-foreground">Configuratie</h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm">Vertraging na annulering</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Wacht X minuten voordat de invite engine draait.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={local.auto_invite_delay_minutes}
                      onChange={(e) => handleNumber('auto_invite_delay_minutes', parseInt(e.target.value) || 0)}
                      onBlur={() => handleNumberBlur('auto_invite_delay_minutes')}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minuten</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Geldigheid uitnodiging</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Hoe lang de gast heeft om te reageren.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={local.invite_window_minutes}
                      onChange={(e) => handleNumber('invite_window_minutes', parseInt(e.target.value) || 30)}
                      onBlur={() => handleNumberBlur('invite_window_minutes')}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minuten</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Gelijktijdige uitnodigingen</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Hoeveel gasten tegelijk worden uitgenodigd.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={local.max_parallel_invites}
                      onChange={(e) => handleNumber('max_parallel_invites', parseInt(e.target.value) || 1)}
                      onBlur={() => handleNumberBlur('max_parallel_invites')}
                      className="w-24"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Prioriteit</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Hoe de volgorde wordt bepaald.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePriorityMode('auto')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        local.priority_mode === 'auto'
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      Automatisch
                    </button>
                    <button
                      onClick={() => handlePriorityMode('manual')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        local.priority_mode === 'manual'
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      Handmatig
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </NestoCard>
        )}
      </div>
    </SettingsSectionLayout>
  );
}
