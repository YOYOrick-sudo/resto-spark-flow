import { useState, useEffect, useRef } from 'react';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { BookingQuestionsEditor } from '@/components/settings/widget/BookingQuestionsEditor';
import { EmbedModeSelector, type EmbedMode } from '@/components/settings/widget/EmbedModeSelector';
import { EmbedCodePreview } from '@/components/settings/widget/EmbedCodePreview';
import { WidgetLivePreview } from '@/components/settings/widget/WidgetLivePreview';
import { useWidgetSettings, useUpdateWidgetSettings, type BookingQuestion } from '@/hooks/useWidgetSettings';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { usePermission } from '@/hooks/usePermission';
import { buildBreadcrumbs } from '@/lib/settingsRouteConfig';
import { nestoToast } from '@/lib/nestoToast';
import { Check, ExternalLink } from 'lucide-react';

const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
const isValidSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug);

interface LocalSettings {
  widget_enabled: boolean;
  location_slug: string;
  widget_welcome_text: string;
  unavailable_text: string;
  show_end_time: boolean;
  show_nesto_branding: boolean;
  widget_primary_color: string;
  widget_logo_url: string;
  widget_success_redirect_url: string;
  booking_questions: BookingQuestion[];
}

export default function SettingsReserveringenWidget() {
  const { data: settings, isLoading } = useWidgetSettings();
  const updateSettings = useUpdateWidgetSettings();
  const hasPermission = usePermission('reservations.settings');
  const [saved, setSaved] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [embedMode, setEmbedMode] = useState<EmbedMode>('button');
  const [buttonLabel, setButtonLabel] = useState('Reserveer');
  const [buttonPosition, setButtonPosition] = useState('bottom-right');

  const [local, setLocal] = useState<LocalSettings>({
    widget_enabled: false,
    location_slug: '',
    widget_welcome_text: '',
    unavailable_text: 'vol',
    show_end_time: true,
    show_nesto_branding: true,
    widget_primary_color: '#10B981',
    widget_logo_url: '',
    widget_success_redirect_url: '',
    booking_questions: [],
  });

  useEffect(() => {
    if (settings) {
      setLocal({
        widget_enabled: settings.widget_enabled,
        location_slug: settings.location_slug || '',
        widget_welcome_text: settings.widget_welcome_text || '',
        unavailable_text: settings.unavailable_text || 'vol',
        show_end_time: settings.show_end_time,
        show_nesto_branding: settings.show_nesto_branding,
        widget_primary_color: settings.widget_primary_color || '#10B981',
        widget_logo_url: settings.widget_logo_url || '',
        widget_success_redirect_url: settings.widget_success_redirect_url || '',
        booking_questions: (settings.booking_questions as BookingQuestion[]) || [],
      });
    }
  }, [settings]);

  const debouncedSave = useDebouncedCallback((updates: Partial<LocalSettings>) => {
    updateSettings.mutate(updates as any, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
      onError: () => nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.'),
    });
  }, 800);

  const updateField = <K extends keyof LocalSettings>(field: K, value: LocalSettings[K]) => {
    setLocal(prev => ({ ...prev, [field]: value }));
    debouncedSave({ [field]: value });
  };

  const breadcrumbs = buildBreadcrumbs('reserveringen', 'widget');

  if (!hasPermission) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <EmptyState title="Geen toegang" description="Je hebt geen rechten om widget-instellingen te beheren." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <SettingsDetailLayout title="Widget" breadcrumbs={breadcrumbs}>
        <CardSkeleton lines={5} />
      </SettingsDetailLayout>
    );
  }

  const baseUrl = window.location.origin;

  const unavailableOptions = [
    { value: 'vol', label: 'Volgeboekt' },
    { value: 'walk_in_only', label: 'Alleen walk-in' },
    { value: 'bel_ons', label: 'Bel ons' },
  ];

  const positionOptions = [
    { value: 'bottom-right', label: 'Rechtsonder' },
    { value: 'bottom-left', label: 'Linksonder' },
  ];

  return (
    <SettingsDetailLayout
      title={
        <span className="flex items-center gap-2">
          Widget
          <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <Check className="h-3 w-3" /> Opgeslagen
          </span>
        </span>
      }
      description="Configureer de publieke boekingswidget voor gasten."
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        {/* Section 1: Algemeen */}
        <NestoCard className="p-6">
          <h3 className="text-sm font-semibold mb-4">Algemeen</h3>
          <div className="bg-secondary/50 rounded-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Widget inschakelen</Label>
                <p className="text-xs text-muted-foreground">Maak de boekingswidget zichtbaar voor gasten</p>
              </div>
              <Switch checked={local.widget_enabled} onCheckedChange={v => updateField('widget_enabled', v)} />
            </div>

            <div>
              <Label className="text-sm mb-1.5">Locatie slug</Label>
              <Input
                value={local.location_slug}
                onChange={e => updateField('location_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="bijv. restaurant-de-kok"
                className="text-sm"
              />
              {local.location_slug && !isValidSlug(local.location_slug) && (
                <p className="text-xs text-destructive mt-1">Alleen kleine letters, cijfers en streepjes.</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Unieke identifier in de widget URL.</p>
            </div>

            <div>
              <Label className="text-sm mb-1.5">Welkomsttekst</Label>
              <Textarea
                value={local.widget_welcome_text}
                onChange={e => updateField('widget_welcome_text', e.target.value)}
                placeholder="Welkom! Reserveer een tafel bij ons."
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-sm mb-1.5">Niet-beschikbaar tekst</Label>
              <NestoSelect
                value={local.unavailable_text}
                onValueChange={v => updateField('unavailable_text', v)}
                options={unavailableOptions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Eindtijd tonen</Label>
                <p className="text-xs text-muted-foreground">Toon de verwachte eindtijd bij elk tijdslot</p>
              </div>
              <Switch checked={local.show_end_time} onCheckedChange={v => updateField('show_end_time', v)} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Nesto branding tonen</Label>
                <p className="text-xs text-muted-foreground">"Powered by Nesto" onderaan de widget</p>
              </div>
              <Switch checked={local.show_nesto_branding} onCheckedChange={v => updateField('show_nesto_branding', v)} />
            </div>

            <div>
              <Label className="text-sm mb-1.5">Redirect URL na boeking</Label>
              <Input
                value={local.widget_success_redirect_url}
                onChange={e => updateField('widget_success_redirect_url', e.target.value)}
                placeholder="https://mijnrestaurant.nl/bedankt"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Optioneel: stuur gasten naar deze URL na een succesvolle boeking.</p>
            </div>
          </div>
        </NestoCard>

        {/* Section 2: Branding */}
        <NestoCard className="p-6">
          <h3 className="text-sm font-semibold mb-4">Branding</h3>
          <div className="bg-secondary/50 rounded-card p-4 space-y-4">
            <div>
              <Label className="text-sm mb-1.5">Widget kleur</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => colorInputRef.current?.click()}
                  className="h-8 w-8 rounded-control border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
                  style={{ backgroundColor: isValidHex(local.widget_primary_color) ? local.widget_primary_color : '#10B981' }}
                />
                <Input
                  value={local.widget_primary_color}
                  onChange={e => updateField('widget_primary_color', e.target.value)}
                  className="text-sm w-[120px]"
                  placeholder="#10B981"
                  maxLength={7}
                />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={isValidHex(local.widget_primary_color) ? local.widget_primary_color : '#10B981'}
                  onChange={e => updateField('widget_primary_color', e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Kleur van knoppen en accenten in de widget.</p>
            </div>

            <div>
              <Label className="text-sm mb-1.5">Widget logo URL</Label>
              <Input
                value={local.widget_logo_url}
                onChange={e => updateField('widget_logo_url', e.target.value)}
                placeholder="https://..."
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Logo dat bovenaan de widget wordt getoond.</p>
            </div>
          </div>
        </NestoCard>

        {/* Section 3: Booking Questions */}
        <NestoCard className="p-6">
          <h3 className="text-sm font-semibold mb-1">Boekingsvragen</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Extra vragen die gasten zien bij het boeken. Antwoorden worden opgeslagen als tags.
          </p>
          <BookingQuestionsEditor
            questions={local.booking_questions}
            onChange={questions => updateField('booking_questions', questions)}
          />
        </NestoCard>

        {/* Section 4: Integratie */}
        {local.widget_enabled && local.location_slug && (
          <NestoCard className="p-6">
            <h3 className="text-sm font-semibold mb-1">Integratie</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Kies hoe je de widget op je website wilt tonen.
            </p>

            <div className="space-y-6">
              {/* 1. Mode selector */}
              <EmbedModeSelector value={embedMode} onChange={setEmbedMode} />

              {/* 2. Mode-specifieke configuratie */}
              {embedMode === 'button' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Knopconfiguratie</h4>
                  <div className="bg-secondary/50 rounded-card-sm p-4 space-y-3">
                    <div>
                      <Label className="text-sm mb-1.5">Knoptekst</Label>
                      <Input
                        value={buttonLabel}
                        onChange={e => setButtonLabel(e.target.value)}
                        placeholder="Reserveer"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5">Positie</Label>
                      <NestoSelect
                        value={buttonPosition}
                        onValueChange={setButtonPosition}
                        options={positionOptions}
                      />
                    </div>
                  </div>
                </div>
              )}

              {embedMode === 'inline' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Container</h4>
                  <div className="bg-secondary/50 rounded-card-sm p-4">
                    <p className="text-xs text-muted-foreground">
                      Plaats een <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">&lt;div id="nesto-booking"&gt;&lt;/div&gt;</code> op je website waar de widget moet verschijnen. De widget vult automatisch deze container.
                    </p>
                  </div>
                </div>
              )}

              {embedMode === 'link' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Widget URL</h4>
                  <div className="bg-secondary/50 rounded-card-sm p-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-mono truncate min-w-0">{baseUrl}/book/{local.location_slug}</p>
                    <a
                      href={`${baseUrl}/book/${local.location_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* 3. Test je integratie */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test je integratie</h4>
                <WidgetLivePreview
                  mode={embedMode}
                  slug={local.location_slug}
                  color={local.widget_primary_color}
                  buttonLabel={buttonLabel}
                  buttonPosition={buttonPosition}
                  baseUrl={baseUrl}
                />
              </div>

              {/* 4. Installatiecode */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {embedMode === 'link' ? 'Widget URL' : 'Installatiecode'}
                </h4>
                <EmbedCodePreview
                  mode={embedMode}
                  slug={local.location_slug}
                  color={local.widget_primary_color}
                  buttonLabel={buttonLabel}
                  buttonPosition={buttonPosition}
                  baseUrl={baseUrl}
                />
              </div>
            </div>
          </NestoCard>
        )}
      </div>
    </SettingsDetailLayout>
  );
}
