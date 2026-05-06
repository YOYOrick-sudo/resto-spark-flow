import { useState, useEffect } from 'react';
import { Bot, Clock, Globe } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NestoNumericInput } from '@/components/polar/NestoNumericInput';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nestoToast } from '@/lib/nestoToast';
import { SettingsCardHeader } from '@/components/settings';

interface MessagingConfig {
  ai_agent_enabled: boolean;
  active_window_start: string;
  active_window_end: string;
  outside_window_reply: string;
  auto_modify_reservations: boolean;
  auto_cancel_reservations: boolean;
  large_party_threshold: number;
  languages: string[];
}

const DEFAULT_CONFIG: MessagingConfig = {
  ai_agent_enabled: false,
  active_window_start: '08:00',
  active_window_end: '00:00',
  outside_window_reply: 'Bedankt voor je bericht! We reageren morgenochtend.',
  auto_modify_reservations: false,
  auto_cancel_reservations: false,
  large_party_threshold: 8,
  languages: ['nl'],
};

const LANGUAGE_OPTIONS = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'Engels' },
  { value: 'de', label: 'Duits' },
  { value: 'fr', label: 'Frans' },
];

export function AgentConfigTab() {
  const { currentLocation } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;

  const { data: config, isLoading } = useQuery({
    queryKey: ['messaging-config', locationId],
    queryFn: async () => {
      if (!locationId) return DEFAULT_CONFIG;
      const { data, error } = await supabase
        .from('messaging_config')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();
      if (error || !data) return DEFAULT_CONFIG;
      return {
        ai_agent_enabled: data.ai_agent_enabled ?? false,
        active_window_start: data.active_window_start || '08:00',
        active_window_end: data.active_window_end || '00:00',
        outside_window_reply: data.outside_window_reply || DEFAULT_CONFIG.outside_window_reply,
        auto_modify_reservations: data.auto_modify_reservations ?? false,
        auto_cancel_reservations: data.auto_cancel_reservations ?? false,
        large_party_threshold: data.large_party_threshold ?? 8,
        languages: data.languages || ['nl'],
      } as MessagingConfig;
    },
    enabled: !!locationId,
  });

  const [local, setLocal] = useState<MessagingConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (config) setLocal(config);
  }, [config]);

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<MessagingConfig>) => {
      if (!locationId) throw new Error('No location');
      const { error } = await supabase
        .from('messaging_config')
        .upsert({
          location_id: locationId,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'location_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-config', locationId] });
      
    },
    onError: () => {
      nestoToast.error('Opslaan mislukt');
    },
  });

  const updateField = <K extends keyof MessagingConfig>(field: K, value: MessagingConfig[K]) => {
    const updated = { ...local, [field]: value };
    setLocal(updated);
    updateConfig.mutate({ [field]: value });
  };

  const toggleLanguage = (lang: string) => {
    const current = local.languages;
    const next = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    if (next.length === 0) return;
    updateField('languages', next);
  };

  if (isLoading) return <CardSkeleton lines={8} />;

  return (
    <div className="space-y-6">
      {/* Main toggle */}
      <NestoCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <SettingsCardHeader
            icon={<Bot />}
            title="AI Assistent"
            description="De Assistent beantwoordt automatisch veelgestelde vragen en helpt gasten met reserveringen."
            className="mb-0 flex-1"
          />
          <Switch
            checked={local.ai_agent_enabled}
            onCheckedChange={(v) => updateField('ai_agent_enabled', v)}
          />
        </div>
      </NestoCard>

      {/* Active window */}
      <NestoCard className="p-6">
        <SettingsCardHeader icon={<Clock />} title="Actief venster" />
        <div className="bg-secondary/50 rounded-card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5">Starttijd</Label>
              <Input
                type="time"
                value={local.active_window_start}
                onChange={(e) => updateField('active_window_start', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5">Eindtijd</Label>
              <Input
                type="time"
                value={local.active_window_end}
                onChange={(e) => updateField('active_window_end', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Buiten dit venster beantwoordt de Assistent alleen reserveringsvragen. Andere vragen worden beantwoord zodra het venster opent.
          </p>
          <div>
            <Label className="text-sm mb-1.5">Auto-reply buiten venster</Label>
            <Textarea
              value={local.outside_window_reply}
              onChange={(e) => updateField('outside_window_reply', e.target.value)}
              className="text-sm min-h-[60px]"
              rows={2}
            />
          </div>
        </div>
      </NestoCard>

      {/* Automatic actions */}
      <NestoCard className="p-6">
        <SettingsCardHeader title="Automatische acties" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Reserveringen wijzigen</Label>
              <p className="text-xs text-muted-foreground">De Assistent wijzigt reserveringen direct zonder goedkeuring.</p>
            </div>
            <Switch
              checked={local.auto_modify_reservations}
              onCheckedChange={(v) => updateField('auto_modify_reservations', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Reserveringen annuleren</Label>
              <p className="text-xs text-muted-foreground">De Assistent annuleert reserveringen direct zonder goedkeuring.</p>
            </div>
            <Switch
              checked={local.auto_cancel_reservations}
              onCheckedChange={(v) => updateField('auto_cancel_reservations', v)}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">Grote groepen drempel</Label>
            <div className="flex items-center gap-2">
              <NestoNumericInput
                min={2}
                max={50}
                integer
                value={local.large_party_threshold}
                onValueChange={(v) => updateField('large_party_threshold', v ?? 8)}
                allowEmpty={false}
                fallback={8}
                className="text-sm w-20"
              />
              <span className="text-xs text-muted-foreground">personen</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Verzoeken voor groepen groter dan dit aantal worden doorgestuurd naar jou.
            </p>
          </div>
        </div>
      </NestoCard>

      {/* Languages */}
      <NestoCard className="p-6">
        <SettingsCardHeader
          icon={<Globe />}
          title="Talen"
          description="De Assistent detecteert automatisch de taal van de gast en antwoordt in dezelfde taal."
        />
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = local.languages.includes(lang.value);
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => toggleLanguage(lang.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </NestoCard>
    </div>
  );
}
