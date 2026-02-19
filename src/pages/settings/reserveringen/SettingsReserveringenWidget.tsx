import { useState, useEffect, useRef } from 'react';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoInput } from '@/components/polar/NestoInput';
import { Switch } from '@/components/ui/switch';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { EmptyState } from '@/components/polar/EmptyState';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { Textarea } from '@/components/ui/textarea';
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

const sectionHeader = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4";
const sectionDivider = "border-t border-border/50 pt-5 mt-5";

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
        {/* Card 1: Configuratie */}
        <NestoCard className="p-6">
          {/* Widget aan/uit */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Widget inschakelen</p>
              <p className="text-xs text-muted-foreground">Maak de boekingswidget zichtbaar voor gasten</p>
            </div>
            <Switch checked={local.widget_enabled} onCheckedChange={v => updateField('widget_enabled', v)} />
          </div>

          {/* Basis */}
          <div className={sectionDivider}>
            <h4 className={sectionHeader}>Basis</h4>
            <div className="space-y-4">
              <div>
                <NestoInput
                  label="Locatie slug"
                  value={local.location_slug}
                  onChange={e => updateField('location_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="bijv. restaurant-de-kok"
                  error={local.location_slug && !isValidSlug(local.location_slug) ? 'Alleen kleine letters, cijfers en streepjes.' : undefined}
                />
                <p className="text-xs text-muted-foreground mt-1">Unieke identifier in de widget URL.</p>
              </div>

              <div className="w-full">
                <label className="mb-2 block text-label text-muted-foreground">Welkomsttekst</label>
                <Textarea
                  value={local.widget_welcome_text}
                  onChange={e => updateField('widget_welcome_text', e.target.value)}
                  placeholder="Welkom! Reserveer een tafel bij ons."
                  className="text-body min-h-[60px] border-[1.5px] border-border bg-card rounded-button focus:!border-primary focus:outline-none focus:ring-0"
                  rows={2}
                />
              </div>

              <NestoSelect
                label="Niet-beschikbaar tekst"
                value={local.unavailable_text}
                onValueChange={v => updateField('unavailable_text', v)}
                options={unavailableOptions}
              />

              <div>
                <NestoInput
                  label="Redirect URL na boeking"
                  value={local.widget_success_redirect_url}
                  onChange={e => updateField('widget_success_redirect_url', e.target.value)}
                  placeholder="https://mijnrestaurant.nl/bedankt"
                />
                <p className="text-xs text-muted-foreground mt-1">Optioneel: stuur gasten naar deze URL na een succesvolle boeking.</p>
              </div>
            </div>
          </div>

          {/* Weergave */}
          <div className={sectionDivider}>
            <h4 className={sectionHeader}>Weergave</h4>
            <div className="divide-y divide-border/50">
              <div className="flex items-center justify-between py-4 first:pt-0">
                <div>
                  <p className="text-sm font-medium">Eindtijd tonen</p>
                  <p className="text-xs text-muted-foreground">Toon de verwachte eindtijd bij elk tijdslot</p>
                </div>
                <Switch checked={local.show_end_time} onCheckedChange={v => updateField('show_end_time', v)} />
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">Nesto branding tonen</p>
                  <p className="text-xs text-muted-foreground">"Powered by Nesto" onderaan de widget</p>
                </div>
                <Switch checked={local.show_nesto_branding} onCheckedChange={v => updateField('show_nesto_branding', v)} />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className={sectionDivider}>
            <h4 className={sectionHeader}>Branding</h4>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-label text-muted-foreground">Widget kleur</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    className="h-8 w-8 rounded-control border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
                    style={{ backgroundColor: isValidHex(local.widget_primary_color) ? local.widget_primary_color : '#10B981' }}
                  />
                  <NestoInput
                    value={local.widget_primary_color}
                    onChange={e => updateField('widget_primary_color', e.target.value)}
                    className="w-[120px]"
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
                <NestoInput
                  label="Widget logo URL"
                  value={local.widget_logo_url}
                  onChange={e => updateField('widget_logo_url', e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">Logo dat bovenaan de widget wordt getoond.</p>
              </div>
            </div>
          </div>
        </NestoCard>

        {/* Card 2: Boekingsvragen */}
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

        {/* Card 3: Integratie */}
        {local.widget_enabled && local.location_slug && (
          <NestoCard className="p-6">
            <h3 className="text-sm font-semibold mb-1">Integratie</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Kies hoe je de widget op je website wilt tonen.
            </p>

            <EmbedModeSelector value={embedMode} onChange={setEmbedMode} />

            {/* Mode-specifieke configuratie */}
            {embedMode === 'button' && (
              <div className={sectionDivider}>
                <h4 className={sectionHeader}>Knopconfiguratie</h4>
                <div className="space-y-4">
                  <NestoInput
                    label="Knoptekst"
                    value={buttonLabel}
                    onChange={e => setButtonLabel(e.target.value)}
                    placeholder="Reserveer"
                  />
                  <NestoSelect
                    label="Positie"
                    value={buttonPosition}
                    onValueChange={setButtonPosition}
                    options={positionOptions}
                  />
                </div>
              </div>
            )}

            {embedMode === 'inline' && (
              <div className={sectionDivider}>
                <h4 className={sectionHeader}>Container</h4>
                <div className="bg-secondary/50 rounded-card-sm p-4">
                  <p className="text-xs text-muted-foreground">
                    Plaats een <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">&lt;div id="nesto-booking"&gt;&lt;/div&gt;</code> op je website waar de widget moet verschijnen.
                  </p>
                </div>
              </div>
            )}

            {embedMode === 'link' && (
              <div className={sectionDivider}>
                <h4 className={sectionHeader}>Widget URL</h4>
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

            {/* Test je integratie */}
            <div className={sectionDivider}>
              <h4 className={sectionHeader}>Test je integratie</h4>
              <WidgetLivePreview
                mode={embedMode}
                slug={local.location_slug}
                color={local.widget_primary_color}
                buttonLabel={buttonLabel}
                buttonPosition={buttonPosition}
                baseUrl={baseUrl}
              />
            </div>

            {/* Installatiecode */}
            <div className={sectionDivider}>
              <h4 className={sectionHeader}>
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
          </NestoCard>
        )}
      </div>
    </SettingsDetailLayout>
  );
}
