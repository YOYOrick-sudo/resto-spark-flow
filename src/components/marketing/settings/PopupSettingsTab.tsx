import { useState, useEffect } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Check, Globe, Copy } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { usePopupConfig, useUpdatePopupConfig } from '@/hooks/usePopupConfig';
import { useMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useUserContext } from '@/contexts/UserContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { nestoToast } from '@/lib/nestoToast';

interface PopupSettingsTabProps {
  readOnly: boolean;
}

const POSITION_OPTIONS = [
  { value: 'top', label: 'Boven' },
  { value: 'bottom', label: 'Onder' },
];

const PREVIEW_OPTIONS = [
  { value: 'popup', label: 'Popup' },
  { value: 'bar', label: 'Sticky bar' },
];

export default function PopupSettingsTab({ readOnly }: PopupSettingsTabProps) {
  const { data: config, isLoading } = usePopupConfig();
  const { data: brandKit } = useMarketingBrandKit();
  const { currentLocation } = useUserContext();
  const updateConfig = useUpdatePopupConfig();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewType, setPreviewType] = useState('popup');

  const [state, setState] = useState({
    is_active: false,
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
  });

  useEffect(() => {
    if (config) {
      setState({
        is_active: config.is_active,
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
    if (!readOnly) debouncedSave({ [key]: value });
  };

  const embedCode = `<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-popup-widget?slug=${currentLocation?.slug || 'your-slug'}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <CardSkeleton lines={6} />;

  const primaryColor = brandKit?.primary_color || '#1d979e';

  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Website Popup & Sticky Bar</h3>
        </div>
        <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check className="h-3 w-3" />
          Opgeslagen
        </span>
      </div>

      {/* Master toggle */}
      <div className="bg-secondary/50 rounded-card p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Website Popup actief</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Schakel alle popup widgets in of uit op je website.
            </p>
          </div>
          <Switch
            checked={state.is_active}
            onCheckedChange={(v) => update('is_active', v)}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Widget types */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-0 mb-5">
        {/* Exit-intent */}
        <div className="flex items-center justify-between py-3">
          <div>
            <Label className="text-sm">Exit-intent popup</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toon een popup wanneer bezoekers de pagina dreigen te verlaten (alleen desktop).
            </p>
          </div>
          <Switch
            checked={state.exit_intent_enabled}
            onCheckedChange={(v) => update('exit_intent_enabled', v)}
            disabled={readOnly}
          />
        </div>

        <div className="border-t border-border" />

        {/* Timed popup */}
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Timed popup</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toon een popup na een ingesteld aantal seconden.
              </p>
            </div>
            <Switch
              checked={state.timed_popup_enabled}
              onCheckedChange={(v) => update('timed_popup_enabled', v)}
              disabled={readOnly}
            />
          </div>
          {state.timed_popup_enabled && (
            <div className="mt-3 flex items-center gap-3">
              <Slider
                value={[state.timed_popup_delay_seconds]}
                onValueChange={([v]) => update('timed_popup_delay_seconds', v)}
                min={5}
                max={60}
                step={5}
                className="flex-1"
                disabled={readOnly}
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
              <p className="text-xs text-muted-foreground mt-0.5">
                Toon een vaste balk boven of onder de pagina.
              </p>
            </div>
            <Switch
              checked={state.sticky_bar_enabled}
              onCheckedChange={(v) => update('sticky_bar_enabled', v)}
              disabled={readOnly}
            />
          </div>
          {state.sticky_bar_enabled && (
            <div className="mt-3 max-w-[200px]">
              <NestoSelect
                value={state.sticky_bar_position}
                onValueChange={(v) => update('sticky_bar_position', v)}
                options={POSITION_OPTIONS}
                disabled={readOnly}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content fields */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        <h4 className="text-sm font-medium">Teksten</h4>
        <div>
          <Label className="text-sm mb-1.5 block">Koptekst</Label>
          <Input
            value={state.headline}
            onChange={(e) => update('headline', e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div>
          <Label className="text-sm mb-1.5 block">Beschrijving</Label>
          <Textarea
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            rows={2}
            disabled={readOnly}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm mb-1.5 block">Knoptekst</Label>
            <Input
              value={state.button_text}
              onChange={(e) => update('button_text', e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Succesmelding</Label>
            <Input
              value={state.success_message}
              onChange={(e) => update('success_message', e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
        <div>
          <Label className="text-sm mb-1.5 block">GDPR tekst</Label>
          <Textarea
            value={state.gdpr_text}
            onChange={(e) => update('gdpr_text', e.target.value)}
            rows={2}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-secondary/50 rounded-card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Live preview</h4>
          <NestoOutlineButtonGroup
            options={PREVIEW_OPTIONS}
            value={previewType}
            onChange={setPreviewType}
            size="sm"
          />
        </div>
        <div className="border border-border rounded-card bg-background p-4 min-h-[200px] flex items-center justify-center">
          {previewType === 'popup' ? (
            <div className="w-full max-w-[380px] bg-card rounded-2xl p-6 shadow-lg border border-border">
              {brandKit?.logo_url && (
                <img src={brandKit.logo_url} alt="Logo" className="h-8 max-w-[140px] object-contain mb-3" />
              )}
              <h3 className="text-lg font-bold text-foreground mb-1">{state.headline}</h3>
              <p className="text-sm text-muted-foreground mb-4">{state.description}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="je@email.nl"
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background"
                  disabled
                />
                <button
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap"
                  style={{ backgroundColor: primaryColor }}
                  disabled
                >
                  {state.button_text}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">{state.gdpr_text}</p>
            </div>
          ) : (
            <div className="w-full bg-card rounded-xl p-3 shadow border border-border flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-foreground flex-1 min-w-0 truncate">{state.headline}</span>
              <input
                type="email"
                placeholder="je@email.nl"
                className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background w-[180px]"
                disabled
              />
              <button
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap"
                style={{ backgroundColor: primaryColor }}
                disabled
              >
                {state.button_text}
              </button>
              <button className="text-muted-foreground text-lg leading-none" disabled>&times;</button>
            </div>
          )}
        </div>
      </div>

      {/* Embed code */}
      <div className="bg-secondary/50 rounded-card p-4">
        <h4 className="text-sm font-medium mb-2">Embed code</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Plak dit in de <code className="bg-background px-1 py-0.5 rounded text-[11px]">&lt;head&gt;</code> van je website.
        </p>
        <div className="bg-background rounded-card-sm p-3 overflow-x-auto mb-3">
          <pre className="text-[12px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
            {embedCode}
          </pre>
        </div>
        <NestoButton size="sm" variant="secondary" onClick={handleCopy} className="gap-1.5">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Gekopieerd' : 'Kopieer code'}
        </NestoButton>
      </div>
    </NestoCard>
  );
}
