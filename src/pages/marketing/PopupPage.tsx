import { useState, useEffect } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { PopupSuggestionCard } from '@/components/marketing/popup/PopupSuggestionCard';
import { usePopupSuggestion } from '@/hooks/usePopupSuggestion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Check, Globe, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { usePopupConfig, useUpdatePopupConfig, PopupType } from '@/hooks/usePopupConfig';
import { useMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useUserContext } from '@/contexts/UserContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { nestoToast } from '@/lib/nestoToast';
import { useTickets } from '@/hooks/useTickets';

const POSITION_OPTIONS = [
  { value: 'top', label: 'Boven' },
  { value: 'bottom', label: 'Onder' },
];

const PREVIEW_OPTIONS = [
  { value: 'popup', label: 'Popup' },
  { value: 'bar', label: 'Sticky bar' },
];

const TYPE_OPTIONS = [
  { value: 'reservation', label: 'Reservering' },
  { value: 'newsletter', label: 'Nieuwsbrief' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_BUTTON_TEXT: Record<PopupType, string> = {
  reservation: 'Reserveer nu',
  newsletter: 'Aanmelden',
  custom: 'Meer info',
};

export default function PopupPage() {
  const { data: config, isLoading } = usePopupConfig();
  const { data: suggestion } = usePopupSuggestion();
  const { data: brandKit } = useMarketingBrandKit();
  const { currentLocation } = useUserContext();
  const updateConfig = useUpdatePopupConfig();
  const { data: ticketsData } = useTickets(currentLocation?.id);
  const [saved, setSaved] = useState(false);
  const [previewType, setPreviewType] = useState('popup');

  const [state, setState] = useState({
    is_active: false,
    popup_type: 'newsletter' as PopupType,
    exit_intent_enabled: false,
    timed_popup_enabled: false,
    timed_popup_delay_seconds: 15,
    sticky_bar_enabled: false,
    sticky_bar_position: 'bottom',
    headline: 'Mis geen enkele actie!',
    description: 'Schrijf je in voor onze nieuwsbrief en ontvang exclusieve aanbiedingen.',
    button_text: 'Aanmelden',
    success_message: 'Bedankt voor je inschrijving!',
    gdpr_text: 'Door je aan te melden ga je akkoord met onze privacy policy.',
    featured_ticket_id: null as string | null,
    custom_button_url: '' as string,
  });

  useEffect(() => {
    if (config) {
      setState({
        is_active: config.is_active,
        popup_type: config.popup_type || 'newsletter',
        exit_intent_enabled: config.exit_intent_enabled,
        timed_popup_enabled: config.timed_popup_enabled,
        timed_popup_delay_seconds: config.timed_popup_delay_seconds,
        sticky_bar_enabled: config.sticky_bar_enabled,
        sticky_bar_position: config.sticky_bar_position,
        headline: config.headline,
        description: config.description,
        button_text: config.button_text,
        success_message: config.success_message,
        gdpr_text: config.gdpr_text,
        featured_ticket_id: config.featured_ticket_id ?? null,
        custom_button_url: config.custom_button_url ?? '',
      });
    }
  }, [config]);

  const debouncedSave = useDebouncedCallback((updates: Record<string, any>) => {
    updateConfig.mutate(updates, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
      onError: () => nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.'),
    });
  }, 800);

  const update = (key: string, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
    debouncedSave({ [key]: value });
  };

  const handleTypeChange = (newType: string) => {
    const type = newType as PopupType;
    setState(prev => ({ ...prev, popup_type: type, button_text: DEFAULT_BUTTON_TEXT[type] }));
    debouncedSave({ popup_type: type, button_text: DEFAULT_BUTTON_TEXT[type] });
  };

  const slug = currentLocation?.slug || 'your-slug';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const previewUrl = `${supabaseUrl}/functions/v1/marketing-popup-preview?slug=${slug}`;

  if (isLoading) return (
    <div className="p-6 max-w-7xl mx-auto">
      <CardSkeleton lines={6} />
    </div>
  );

  const primaryColor = brandKit?.primary_color || '#1d979e';
  const activeTickets = ticketsData?.visibleTickets?.filter(t => t.status === 'active') ?? [];
  const featuredTicket = activeTickets.find(t => t.id === state.featured_ticket_id);
  const ticketOptions = [
    { value: '__none__', label: 'Geen' },
    ...activeTickets.map(t => ({ value: t.id, label: t.display_title || t.name })),
  ];

  const isReservation = state.popup_type === 'reservation';
  const isNewsletter = state.popup_type === 'newsletter';
  const isCustom = state.popup_type === 'custom';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* AI Suggestion */}
      {suggestion && <PopupSuggestionCard suggestion={suggestion} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Website Popup</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <Check className="h-3 w-3" />
            Opgeslagen
          </span>
          <Switch
            checked={state.is_active}
            onCheckedChange={(v) => update('is_active', v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Configuration */}
        <div className="space-y-5">
          {/* Popup type */}
          <NestoCard className="p-4">
            <h4 className="text-sm font-medium mb-3">Popup type</h4>
            <NestoOutlineButtonGroup
              options={TYPE_OPTIONS}
              value={state.popup_type}
              onChange={handleTypeChange}
            />
          </NestoCard>

          {/* Content fields */}
          <NestoCard className="p-4 space-y-4">
            <h4 className="text-sm font-medium">Teksten</h4>
            <div>
              <Label className="text-sm mb-1.5 block">Koptekst</Label>
              <Input
                value={state.headline}
                onChange={(e) => update('headline', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Beschrijving</Label>
              <Textarea
                value={state.description}
                onChange={(e) => update('description', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Knoptekst</Label>
              <Input
                value={state.button_text}
                onChange={(e) => update('button_text', e.target.value)}
              />
            </div>

            {/* Reservation: ticket selector */}
            {isReservation && (
              <div>
                <Label className="text-sm mb-1.5 block">Uitgelicht ticket</Label>
                <NestoSelect
                  value={state.featured_ticket_id || '__none__'}
                  onValueChange={(v) => update('featured_ticket_id', v === '__none__' ? null : v)}
                  options={ticketOptions}
                />
                {featuredTicket && (
                  <div
                    className="mt-2 rounded-xl p-3 border flex items-center gap-3"
                    style={{ borderColor: featuredTicket.color, backgroundColor: `${featuredTicket.color}10` }}
                  >
                    <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: featuredTicket.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{featuredTicket.display_title}</p>
                      {featuredTicket.short_description && (
                        <p className="text-xs text-muted-foreground truncate">{featuredTicket.short_description}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Newsletter: success + GDPR */}
            {isNewsletter && (
              <>
                <div>
                  <Label className="text-sm mb-1.5 block">Succesmelding</Label>
                  <Input
                    value={state.success_message}
                    onChange={(e) => update('success_message', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">GDPR tekst</Label>
                  <Textarea
                    value={state.gdpr_text}
                    onChange={(e) => update('gdpr_text', e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Custom: URL */}
            {isCustom && (
              <div>
                <Label className="text-sm mb-1.5 block">Link URL</Label>
                <Input
                  value={state.custom_button_url}
                  onChange={(e) => update('custom_button_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
          </NestoCard>

          {/* Display settings */}
          <NestoCard className="p-4 space-y-0">
            <h4 className="text-sm font-medium mb-3">Weergave</h4>

            {/* Exit-intent */}
            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-sm">Exit-intent popup</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Toon popup bij verlaten pagina (desktop).</p>
              </div>
              <Switch checked={state.exit_intent_enabled} onCheckedChange={(v) => update('exit_intent_enabled', v)} />
            </div>

            <div className="border-t border-border" />

            {/* Timed popup */}
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Timed popup</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Toon popup na aantal seconden.</p>
                </div>
                <Switch checked={state.timed_popup_enabled} onCheckedChange={(v) => update('timed_popup_enabled', v)} />
              </div>
              {state.timed_popup_enabled && (
                <div className="mt-3 flex items-center gap-3">
                  <Slider
                    value={[state.timed_popup_delay_seconds]}
                    onValueChange={([v]) => update('timed_popup_delay_seconds', v)}
                    min={5} max={60} step={5}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums w-16 text-right">
                    {state.timed_popup_delay_seconds}s
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Sticky bar */}
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Sticky bar</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Vaste balk boven of onder de pagina.</p>
                </div>
                <Switch checked={state.sticky_bar_enabled} onCheckedChange={(v) => update('sticky_bar_enabled', v)} />
              </div>
              {state.sticky_bar_enabled && (
                <div className="mt-3 max-w-[200px]">
                  <NestoSelect
                    value={state.sticky_bar_position}
                    onValueChange={(v) => update('sticky_bar_position', v)}
                    options={POSITION_OPTIONS}
                  />
                </div>
              )}
            </div>
          </NestoCard>
        </div>

        {/* RIGHT: Live preview */}
        <div className="space-y-5">
          <NestoCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Live preview</h4>
              <NestoOutlineButtonGroup
                options={PREVIEW_OPTIONS}
                value={previewType}
                onChange={setPreviewType}
                size="sm"
              />
            </div>
            <div
              className="border border-border rounded-card overflow-hidden min-h-[400px] relative"
              style={{
                backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                backgroundColor: 'hsl(var(--background))',
              }}
            >
              {previewType === 'popup' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-4">
                  <div className="w-full max-w-[380px] bg-card rounded-2xl p-6 shadow-lg border border-border">
                    {brandKit?.logo_url && (
                      <img src={brandKit.logo_url} alt="Logo" className="h-8 max-w-[140px] object-contain mb-3" />
                    )}
                    <h3 className="text-lg font-bold text-foreground mb-1">{state.headline}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{state.description}</p>

                    {/* Newsletter: email form */}
                    {isNewsletter && (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="email" placeholder="je@email.nl"
                            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background" disabled
                          />
                          <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap" style={{ backgroundColor: primaryColor }} disabled>
                            {state.button_text}
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-3">{state.gdpr_text}</p>
                      </>
                    )}

                    {/* Reservation: ticket card + CTA */}
                    {isReservation && (
                      <>
                        {featuredTicket && (
                          <div
                            className="rounded-lg p-2.5 flex items-center gap-2.5 border mb-3"
                            style={{ borderColor: featuredTicket.color, backgroundColor: `${featuredTicket.color}10` }}
                          >
                            <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: featuredTicket.color }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">{featuredTicket.display_title}</p>
                              {featuredTicket.short_description && (
                                <p className="text-[10px] text-muted-foreground truncate">{featuredTicket.short_description}</p>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-md text-white flex-shrink-0" style={{ backgroundColor: featuredTicket.color }}>
                              Reserveer
                            </span>
                          </div>
                        )}
                        <button className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }} disabled>
                          {state.button_text}
                        </button>
                      </>
                    )}

                    {/* Custom: button with link */}
                    {isCustom && (
                      <button className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }} disabled>
                        <LinkIcon className="h-3.5 w-3.5" />
                        {state.button_text}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-x-0 flex items-center" style={{ [state.sticky_bar_position === 'top' ? 'top' : 'bottom']: 0 }}>
                  <div className="w-full bg-card p-3 shadow border-t border-border flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-foreground flex-1 min-w-0 truncate">{state.headline}</span>
                    {isNewsletter && (
                      <input type="email" placeholder="je@email.nl" className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background w-[180px]" disabled />
                    )}
                    <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap" style={{ backgroundColor: primaryColor }} disabled>
                      {state.button_text}
                    </button>
                    <button className="text-muted-foreground text-lg leading-none" disabled>&times;</button>
                  </div>
                </div>
              )}
            </div>
          </NestoCard>

          <NestoButton
            variant="secondary"
            onClick={() => window.open(previewUrl, '_blank')}
            className="gap-1.5 w-full"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview openen in nieuw tabblad
          </NestoButton>
        </div>
      </div>
    </div>
  );
}
