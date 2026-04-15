import { useState, useEffect } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { Check, RotateCcw, Eye, ChevronDown, ChevronUp, Mail, Bell } from 'lucide-react';
import {
  useReservationEmailTemplates,
  useUpsertEmailTemplate,
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  DEFAULT_TEMPLATES,
  MERGE_FIELDS,
  type TemplateKey,
} from '@/hooks/useReservationEmailTemplates';
import { useReservationSettings, useUpsertReservationSettings } from '@/hooks/useReservationSettings';
import { useUserContext } from '@/contexts/UserContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { NestoModal } from '@/components/polar/NestoModal';

interface LocalTemplate {
  subject: string;
  body: string;
  is_active: boolean;
}

export function GastberichtenTab() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const { data: templates, isLoading } = useReservationEmailTemplates();
  const upsert = useUpsertEmailTemplate();
  const { data: resSettings } = useReservationSettings(locationId);
  const upsertSettings = useUpsertReservationSettings();

  const [localTemplates, setLocalTemplates] = useState<Record<string, LocalTemplate>>({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<TemplateKey | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Initialize local templates from DB or defaults
  useEffect(() => {
    const initial: Record<string, LocalTemplate> = {};
    for (const key of TEMPLATE_KEYS) {
      const existing = templates?.find(t => t.template_key === key);
      if (existing) {
        initial[key] = { subject: existing.subject, body: existing.body, is_active: existing.is_active };
      } else {
        initial[key] = { subject: DEFAULT_TEMPLATES[key].subject, body: DEFAULT_TEMPLATES[key].body, is_active: true };
      }
    }
    setLocalTemplates(initial);
  }, [templates]);

  const debouncedSave = useDebouncedCallback((key: string, data: LocalTemplate) => {
    upsert.mutate({ template_key: key, subject: data.subject, body: data.body, is_active: data.is_active }, {
      onSuccess: () => {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
      },
    });
  }, 800);

  const updateTemplate = (key: string, field: keyof LocalTemplate, value: string | boolean) => {
    const updated = { ...localTemplates[key], [field]: value };
    setLocalTemplates(prev => ({ ...prev, [key]: updated }));
    debouncedSave(key, updated);
  };

  const resetTemplate = (key: TemplateKey) => {
    const def = DEFAULT_TEMPLATES[key];
    const reset = { subject: def.subject, body: def.body, is_active: true };
    setLocalTemplates(prev => ({ ...prev, [key]: reset }));
    upsert.mutate({ template_key: key, ...reset });
  };

  // Reminder settings
  const [reminderSettings, setReminderSettings] = useState({
    reminder_24h_enabled: true,
    reminder_3h_enabled: true,
    reconfirm_enabled: false,
    reconfirm_min_risk_score: 60,
  });

  useEffect(() => {
    if (resSettings) {
      setReminderSettings({
        reminder_24h_enabled: (resSettings as any).reminder_24h_enabled ?? true,
        reminder_3h_enabled: (resSettings as any).reminder_3h_enabled ?? true,
        reconfirm_enabled: (resSettings as any).reconfirm_enabled ?? false,
        reconfirm_min_risk_score: (resSettings as any).reconfirm_min_risk_score ?? 60,
      });
    }
  }, [resSettings]);

  const updateReminderSetting = (field: string, value: boolean | number) => {
    const updated = { ...reminderSettings, [field]: value };
    setReminderSettings(updated);
    if (locationId) {
      upsertSettings.mutate({ location_id: locationId, ...updated });
    }
  };

  const renderPreview = (key: TemplateKey) => {
    const t = localTemplates[key];
    if (!t) return '';
    const vars: Record<string, string> = {
      '{voornaam}': 'Jan',
      '{achternaam}': 'de Vries',
      '{datum}': 'vrijdag 15 maart 2026',
      '{tijd}': '19:30',
      '{gasten}': '4',
      '{restaurant}': currentLocation?.name || 'Restaurant De Kok',
      '{beheerlink}': 'https://...',
      '{ticket}': 'Diner',
    };
    let text = t.body;
    for (const [k, v] of Object.entries(vars)) {
      text = text.split(k).join(v);
    }
    // Convert literal \n sequences to real newlines
    text = text.replace(/\\n/g, '\n');
    return text;
  };

  if (isLoading) return <CardSkeleton lines={5} />;

  // Group templates: transactional vs reminders
  const transactionalKeys: TemplateKey[] = ['confirmation', 'waitlist_confirmation', 'waitlist_invite', 'cancellation'];
  const reminderKeys: TemplateKey[] = ['reminder_24h', 'reminder_3h', 'reconfirm'];

  return (
    <div className="space-y-6">
      {/* Transactional Templates */}
      <NestoCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Transactionele berichten</h3>
          <FieldHelp>
            <p className="text-muted-foreground">Automatische emails die worden verstuurd bij boekingen, annuleringen en wachtlijst-acties.</p>
          </FieldHelp>
        </div>

        <div className="space-y-2">
          {transactionalKeys.map(key => (
            <TemplateCard
              key={key}
              templateKey={key}
              template={localTemplates[key]}
              expanded={expandedKey === key}
              onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
              onChange={(field, value) => updateTemplate(key, field, value)}
              onReset={() => resetTemplate(key)}
              onPreview={() => setPreviewKey(key)}
              saved={saved === key}
            />
          ))}
        </div>
      </NestoCard>

      {/* Reminder Templates + Settings */}
      <NestoCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Herinneringen & herbevestiging</h3>
          <FieldHelp>
            <p className="text-muted-foreground">Automatische herinneringen en herbevestigingsverzoeken voor gasten.</p>
          </FieldHelp>
        </div>

        {/* Settings toggles */}
        <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Herinnering T-24u</p>
              <p className="text-xs text-muted-foreground">Een dag van tevoren</p>
            </div>
            <Switch checked={reminderSettings.reminder_24h_enabled} onCheckedChange={v => updateReminderSetting('reminder_24h_enabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Herinnering T-3u</p>
              <p className="text-xs text-muted-foreground">Drie uur van tevoren</p>
            </div>
            <Switch checked={reminderSettings.reminder_3h_enabled} onCheckedChange={v => updateReminderSetting('reminder_3h_enabled', v)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Herbevestiging</p>
                <p className="text-xs text-muted-foreground">Vraag gasten met hoog no-show risico om te herbevestigen</p>
              </div>
              <Switch checked={reminderSettings.reconfirm_enabled} onCheckedChange={v => updateReminderSetting('reconfirm_enabled', v)} />
            </div>
            {reminderSettings.reconfirm_enabled && (
              <div className="pl-0 pt-2">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Minimale risicoscore: {reminderSettings.reconfirm_min_risk_score}%
                </Label>
                <Slider
                  value={[reminderSettings.reconfirm_min_risk_score]}
                  onValueChange={([v]) => updateReminderSetting('reconfirm_min_risk_score', v)}
                  min={20}
                  max={90}
                  step={5}
                  className="w-full max-w-xs"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {reminderKeys.map(key => (
            <TemplateCard
              key={key}
              templateKey={key}
              template={localTemplates[key]}
              expanded={expandedKey === key}
              onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
              onChange={(field, value) => updateTemplate(key, field, value)}
              onReset={() => resetTemplate(key)}
              onPreview={() => setPreviewKey(key)}
              saved={saved === key}
            />
          ))}
        </div>
      </NestoCard>

      {/* Merge fields reference */}
      <NestoCard className="p-6">
        <h3 className="text-sm font-semibold mb-3">Beschikbare merge fields</h3>
        <div className="flex flex-wrap gap-2">
          {MERGE_FIELDS.map(f => (
            <code key={f.key} className="text-xs bg-secondary px-2 py-1 rounded-md font-mono">
              {f.key} <span className="text-muted-foreground">— {f.label}</span>
            </code>
          ))}
        </div>
      </NestoCard>

      {/* Preview modal */}
      {previewKey && (
        <NestoModal open onOpenChange={() => setPreviewKey(null)} title={`Preview: ${TEMPLATE_LABELS[previewKey]}`}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Onderwerp</Label>
              <p className="text-sm font-medium">{localTemplates[previewKey]?.subject}</p>
            </div>
            <div className="bg-secondary/50 rounded-card p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">{renderPreview(previewKey)}</pre>
            </div>
          </div>
        </NestoModal>
      )}
    </div>
  );
}

// ============================================
// Template Card Component
// ============================================

interface TemplateCardProps {
  templateKey: TemplateKey;
  template?: LocalTemplate;
  expanded: boolean;
  onToggle: () => void;
  onChange: (field: keyof LocalTemplate, value: string | boolean) => void;
  onReset: () => void;
  onPreview: () => void;
  saved: boolean;
}

function TemplateCard({ templateKey, template, expanded, onToggle, onChange, onReset, onPreview, saved }: TemplateCardProps) {
  if (!template) return null;

  return (
    <div className="border border-border/50 rounded-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{TEMPLATE_LABELS[templateKey]}</span>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Check className="h-3 w-3" /> Opgeslagen
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NestoBadge variant={template.is_active ? 'primary' : 'default'} size="sm">
            {template.is_active ? 'Actief' : 'Uit'}
          </NestoBadge>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-border/30">
          <div className="flex items-center justify-between pt-3">
            <Label className="text-xs text-muted-foreground">Actief</Label>
            <Switch checked={template.is_active} onCheckedChange={v => onChange('is_active', v)} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1">Onderwerp</Label>
            <Input
              value={template.subject}
              onChange={e => onChange('subject', e.target.value)}
              className="text-sm"
              placeholder="Email onderwerp..."
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1">Inhoud</Label>
            <Textarea
              value={template.body}
              onChange={e => onChange('body', e.target.value)}
              className="text-sm min-h-[120px]"
              placeholder="Email body met merge fields..."
            />
          </div>

          <div className="flex gap-2">
            <NestoButton variant="outline" size="sm" onClick={onPreview} leftIcon={<Eye className="h-3.5 w-3.5" />}>
              Preview
            </NestoButton>
            <NestoButton variant="outline" size="sm" onClick={onReset} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
              Reset
            </NestoButton>
          </div>
        </div>
      )}
    </div>
  );
}
