import { useState, useEffect } from 'react';
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
import { WidgetLogoUpload } from '@/components/settings/widget/WidgetLogoUpload';
import { WidgetButtonLogoUpload } from '@/components/settings/widget/WidgetButtonLogoUpload';
import { useWidgetSettings, useUpdateWidgetSettings, type BookingQuestion } from '@/hooks/useWidgetSettings';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { usePermission } from '@/hooks/usePermission';
import { buildBreadcrumbs } from '@/lib/settingsRouteConfig';
import { nestoToast } from '@/lib/nestoToast';
import { ColorPaletteSelector } from '@/components/settings/widget/ColorPaletteSelector';
import { Check, ExternalLink } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';

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
  widget_accent_color: string;
  widget_style: 'auto' | 'showcase' | 'quick';
  widget_logo_url: string;
  widget_success_redirect_url: string;
  booking_questions: BookingQuestion[];
  widget_button_style: string;
}

const PRESET_COLORS = [
  '#10B981', '#059669', '#0EA5E9', '#6366F1',
  '#8B5CF6', '#EC4899', '#F43F5E', '#EF4444',
  '#F97316', '#F59E0B', '#84CC16', '#14B8A6',
  '#06B6D4', '#3B82F6', '#A855F7', '#1F2937',
];


const sectionHeader = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4";
const sectionDivider = "border-t border-border/50 pt-5 mt-5";

const CardHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-5">
    <h3 className="text-base font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
  </div>
);

export default function SettingsReserveringenWidget() {
  const { data: settings, isLoading } = useWidgetSettings();
  const updateSettings = useUpdateWidgetSettings();
  const hasPermission = usePermission('reservations.settings');
  const { currentLocation } = useUserContext();
  const restaurantName = currentLocation?.name || '';
  const [saved, setSaved] = useState(false);
  const [embedMode, setEmbedMode] = useState<EmbedMode>('button');
  const [buttonLabel, setButtonLabel] = useState('Reserveer');
  const [buttonPosition, setButtonPosition] = useState('bottom-right');
  const [buttonPulse, setButtonPulse] = useState(false);

  const [local, setLocal] = useState<LocalSettings>({
    widget_enabled: false,
    location_slug: '',
    widget_welcome_text: '',
    unavailable_text: 'vol',
    show_end_time: true,
    show_nesto_branding: true,
    widget_primary_color: '#10B981',
    widget_accent_color: '#14B8A6',
    widget_style: 'auto',
    widget_logo_url: '',
    widget_success_redirect_url: '',
    booking_questions: [],
    widget_button_style: 'rounded',
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
        widget_accent_color: settings.widget_accent_color || '#14B8A6',
        widget_style: settings.widget_style || 'auto',
        widget_logo_url: settings.widget_logo_url || '',
        widget_success_redirect_url: settings.widget_success_redirect_url || '',
        booking_questions: (settings.booking_questions as BookingQuestion[]) || [],
        widget_button_style: settings.widget_button_style || 'rounded',
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

  const updateFields = (updates: Partial<LocalSettings>) => {
    setLocal(prev => ({ ...prev, ...updates }));
    debouncedSave(updates);
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
          <CardHeader title="Configuratie" description="Widget status en basisinstellingen." />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Widget inschakelen</p>
                <p className="text-xs text-muted-foreground">Maak de boekingswidget zichtbaar voor gasten</p>
              </div>
              <Switch checked={local.widget_enabled} onCheckedChange={v => updateField('widget_enabled', v)} />
            </div>

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
        </NestoCard>

        {/* Card 2: Weergave */}
        <NestoCard className="p-6">
          <CardHeader title="Weergave" description="Bepaal wat gasten zien in de widget." />
          <div className="divide-y divide-border/50">
            {/* Widget stijl selector */}
            <div className="pb-4">
              <label className="mb-2 block text-label text-muted-foreground">Widget stijl</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'auto' as const, label: 'Auto', desc: 'Op basis van aantal tickets' },
                  { value: 'showcase' as const, label: 'Showcase', desc: 'Ticket-first selectie' },
                  { value: 'quick' as const, label: 'Quick', desc: 'Direct naar datum & tijd' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('widget_style', opt.value)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 border rounded-card text-center transition-colors ${
                      local.widget_style === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-[11px] leading-tight opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Auto kiest Showcase bij 2+ tickets, anders Quick.
              </p>
            </div>

            <div className="flex items-center justify-between py-4">
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
        </NestoCard>

        {/* Card 3: Branding */}
        <NestoCard className="p-6">
          <CardHeader title="Branding" description="Kleuren, logo en knoopstijl van de widget." />
          <div className="space-y-5">
            {/* Color palette selector */}
            <ColorPaletteSelector
              primaryColor={local.widget_primary_color}
              accentColor={local.widget_accent_color}
              onPrimaryChange={color => updateField('widget_primary_color', color)}
              onAccentChange={color => updateField('widget_accent_color', color)}
              onPaletteChange={(primary, accent) =>
                updateFields({ widget_primary_color: primary, widget_accent_color: accent })
              }
            />

            {/* Logo upload */}
            <WidgetLogoUpload logoUrl={local.widget_logo_url || null} />

            {/* Button style selector */}
            <div>
              <label className="mb-2 block text-label text-muted-foreground">Knoopstijl</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField('widget_button_style', 'rounded')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-card text-sm font-medium transition-colors ${
                    local.widget_button_style === 'rounded'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <span className="inline-block h-5 w-14 rounded-full border-2" style={{ borderColor: isValidHex(local.widget_primary_color) ? local.widget_primary_color : '#10B981' }} />
                  Afgerond
                </button>
                <button
                  type="button"
                  onClick={() => updateField('widget_button_style', 'square')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-card text-sm font-medium transition-colors ${
                    local.widget_button_style === 'square'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <span className="inline-block h-5 w-14 rounded-button border-2" style={{ borderColor: isValidHex(local.widget_primary_color) ? local.widget_primary_color : '#10B981' }} />
                  Rechthoekig
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Stijl van knoppen in de boekingswidget.</p>
            </div>
          </div>
        </NestoCard>

        {/* Card 4: Boekingsvragen */}
        <NestoCard className="p-6">
          <CardHeader title="Boekingsvragen" description="Extra vragen die gasten zien bij het boeken. Antwoorden worden opgeslagen als tags." />
          <BookingQuestionsEditor
            questions={local.booking_questions}
            onChange={questions => updateField('booking_questions', questions)}
          />
        </NestoCard>

        {/* Card 5: Integratie */}
        {local.widget_enabled && local.location_slug && (
          <NestoCard className="p-6">
            <CardHeader title="Integratie" description="Kies hoe je de widget op je website wilt tonen." />

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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Pulse indicator</p>
                      <p className="text-xs text-muted-foreground">Groene dot die beschikbaarheid aangeeft</p>
                    </div>
                    <Switch checked={buttonPulse} onCheckedChange={setButtonPulse} />
                  </div>
                  <WidgetButtonLogoUpload logoUrl={settings?.widget_button_logo_url ?? null} />
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
                logoUrl={local.widget_logo_url}
                restaurantName={restaurantName}
                buttonLogoUrl={settings?.widget_button_logo_url ?? undefined}
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
                pulse={buttonPulse}
                logoUrl={local.widget_logo_url}
                restaurantName={restaurantName}
                buttonLogoUrl={settings?.widget_button_logo_url ?? undefined}
              />
            </div>
          </NestoCard>
        )}
      </div>
    </SettingsDetailLayout>
  );
}
