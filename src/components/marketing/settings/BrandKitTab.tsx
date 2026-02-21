import { useState, useEffect, useRef, useCallback } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { Check, Trash2, Upload } from 'lucide-react';
import { useMarketingBrandKit, useUpdateMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useMarketingLogoUpload } from '@/hooks/useMarketingLogoUpload';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { nestoToast } from '@/lib/nestoToast';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Source Serif Pro', label: 'Source Serif Pro' },
];

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formeel', description: 'Professioneel en zakelijk' },
  { value: 'friendly', label: 'Vriendelijk', description: 'Warm en persoonlijk' },
  { value: 'casual', label: 'Casual', description: 'Ontspannen en informeel' },
  { value: 'playful', label: 'Speels', description: 'Speels en creatief' },
];

const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);

interface BrandKitTabProps {
  readOnly: boolean;
}

interface LocalState {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  tone_of_voice: string;
  tone_description: string;
  default_greeting: string;
  default_signature: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
}

export default function BrandKitTab({ readOnly }: BrandKitTabProps) {
  const { data: brandKit, isLoading } = useMarketingBrandKit();
  const updateBrandKit = useUpdateMarketingBrandKit();
  const { uploadLogo, deleteLogo, isUploading } = useMarketingLogoUpload();
  const [saved, setSaved] = useState(false);
  const [confirmDeleteLogo, setConfirmDeleteLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const primaryRef = useRef<HTMLInputElement>(null);
  const secondaryRef = useRef<HTMLInputElement>(null);
  const accentRef = useRef<HTMLInputElement>(null);

  const [local, setLocal] = useState<LocalState>({
    primary_color: '#1d979e',
    secondary_color: '#f0f4f8',
    accent_color: '#e85d04',
    font_heading: 'Inter',
    font_body: 'Inter',
    tone_of_voice: 'friendly',
    tone_description: '',
    default_greeting: '',
    default_signature: '',
    social_instagram: '',
    social_facebook: '',
    social_tiktok: '',
  });

  useEffect(() => {
    if (brandKit) {
      const handles = (brandKit.social_handles ?? {}) as Record<string, string>;
      setLocal({
        primary_color: brandKit.primary_color || '#1d979e',
        secondary_color: brandKit.secondary_color || '#f0f4f8',
        accent_color: brandKit.accent_color || '#e85d04',
        font_heading: brandKit.font_heading || 'Inter',
        font_body: brandKit.font_body || 'Inter',
        tone_of_voice: brandKit.tone_of_voice || 'friendly',
        tone_description: brandKit.tone_description || '',
        default_greeting: brandKit.default_greeting || '',
        default_signature: brandKit.default_signature || '',
        social_instagram: handles.instagram || '',
        social_facebook: handles.facebook || '',
        social_tiktok: handles.tiktok || '',
      });
    }
  }, [brandKit]);

  const debouncedSave = useDebouncedCallback((updates: Record<string, any>) => {
    updateBrandKit.mutate(updates, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
      onError: () => nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.'),
    });
  }, 800);

  const updateField = (field: keyof LocalState, value: string) => {
    const updated = { ...local, [field]: value };
    setLocal(updated);
    if (readOnly) return;

    // Color validation
    if (field.endsWith('_color') && !isValidHex(value)) return;

    // Social handles → JSONB
    if (field.startsWith('social_')) {
      debouncedSave({
        social_handles: {
          instagram: field === 'social_instagram' ? value : updated.social_instagram,
          facebook: field === 'social_facebook' ? value : updated.social_facebook,
          tiktok: field === 'social_tiktok' ? value : updated.social_tiktok,
        },
      });
      return;
    }

    debouncedSave({ [field]: value || null });
  };

  const handleFile = useCallback((file: File | undefined) => {
    if (file && !readOnly) uploadLogo(file);
  }, [uploadLogo, readOnly]);

  if (isLoading) return <CardSkeleton lines={8} />;

  const logoUrl = brandKit?.logo_url;

  const ColorPicker = ({ label, field, ref: pickerRef }: { label: string; field: keyof LocalState; ref: React.RefObject<HTMLInputElement | null> }) => (
    <div>
      <Label className="text-sm mb-1.5">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          className="h-8 w-8 rounded-control border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
          style={{ backgroundColor: isValidHex(local[field]) ? local[field] : '#ccc' }}
          disabled={readOnly}
        />
        <Input
          value={local[field]}
          onChange={(e) => updateField(field, e.target.value)}
          className="text-sm w-[120px]"
          placeholder="#000000"
          maxLength={7}
          disabled={readOnly}
        />
        <input
          ref={pickerRef}
          type="color"
          value={isValidHex(local[field]) ? local[field] : '#000000'}
          onChange={(e) => updateField(field, e.target.value)}
          className="sr-only"
          tabIndex={-1}
          disabled={readOnly}
        />
      </div>
    </div>
  );

  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold">Brand Kit</h3>
        <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check className="h-3 w-3" />
          Opgeslagen
        </span>
      </div>

      {/* Logo */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        <div>
          <Label className="text-sm mb-1.5">Marketing logo</Label>
          {isUploading ? (
            <>
              <Skeleton className="h-20 w-full rounded-card" />
              <p className="text-xs text-muted-foreground mt-1">Bezig met uploaden…</p>
            </>
          ) : logoUrl ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => !readOnly && fileRef.current?.click()}
                  className="h-20 px-4 border border-border rounded-card flex items-center justify-center bg-background hover:bg-secondary/40 transition-colors cursor-pointer"
                >
                  <img src={logoUrl} alt="Marketing logo" className="max-h-16 max-w-[200px] object-contain" />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLogo(true)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-control"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Klik op het logo om een ander bestand te kiezen.</p>
            </>
          ) : (
            <>
              <div
                role="button"
                tabIndex={0}
                onClick={() => !readOnly && fileRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && !readOnly && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                className={`h-20 border border-dashed rounded-card flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                }`}
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sleep een logo hierheen of klik om te uploaden</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG of SVG. Max 2 MB.</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <ConfirmDialog
            open={confirmDeleteLogo}
            onOpenChange={setConfirmDeleteLogo}
            title="Logo verwijderen"
            description="Weet je zeker dat je het marketing logo wilt verwijderen?"
            confirmLabel="Verwijderen"
            variant="destructive"
            onConfirm={() => { setConfirmDeleteLogo(false); deleteLogo(); }}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        <h4 className="text-sm font-medium">Kleuren</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorPicker label="Primaire kleur" field="primary_color" ref={primaryRef} />
          <ColorPicker label="Secundaire kleur" field="secondary_color" ref={secondaryRef} />
          <ColorPicker label="Accent kleur" field="accent_color" ref={accentRef} />
        </div>
      </div>

      {/* Fonts */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        <h4 className="text-sm font-medium">Typografie</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm mb-1.5">Heading font</Label>
            <NestoSelect
              value={local.font_heading}
              onValueChange={(v) => updateField('font_heading', v)}
              options={FONT_OPTIONS}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">Body font</Label>
            <NestoSelect
              value={local.font_body}
              onValueChange={(v) => updateField('font_body', v)}
              options={FONT_OPTIONS}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Tone of voice */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        <h4 className="text-sm font-medium">Tone of voice</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TONE_OPTIONS.map((tone) => (
            <button
              key={tone.value}
              type="button"
              onClick={() => updateField('tone_of_voice', tone.value)}
              disabled={readOnly}
              className={`p-3 rounded-card border text-left transition-colors ${
                local.tone_of_voice === tone.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-sm font-medium block">{tone.label}</span>
              <span className="text-xs text-muted-foreground">{tone.description}</span>
            </button>
          ))}
        </div>
        <div>
          <Label className="text-sm mb-1.5">Tone beschrijving</Label>
          <Textarea
            value={local.tone_description}
            onChange={(e) => updateField('tone_description', e.target.value)}
            placeholder="Beschrijf de gewenste toon en stijl voor marketing communicatie…"
            className="text-sm min-h-[60px]"
            rows={2}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Greeting & Signature */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        <h4 className="text-sm font-medium">Begroeting & Afsluiting</h4>
        <div>
          <Label className="text-sm mb-1.5">Standaard begroeting</Label>
          <Input
            value={local.default_greeting}
            onChange={(e) => updateField('default_greeting', e.target.value)}
            placeholder="Bijv. Beste {voornaam},"
            className="text-sm"
            disabled={readOnly}
          />
        </div>
        <div>
          <Label className="text-sm mb-1.5">Standaard afsluiting</Label>
          <Input
            value={local.default_signature}
            onChange={(e) => updateField('default_signature', e.target.value)}
            placeholder="Bijv. Met vriendelijke groet, Team Restaurant"
            className="text-sm"
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Social handles */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-4">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-medium">Social media</h4>
          <FieldHelp>
            <p className="text-muted-foreground">Links worden getoond in marketing emails en campagnes.</p>
          </FieldHelp>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm mb-1.5">Instagram</Label>
            <Input
              value={local.social_instagram}
              onChange={(e) => updateField('social_instagram', e.target.value)}
              placeholder="@restaurantnaam"
              className="text-sm"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">Facebook</Label>
            <Input
              value={local.social_facebook}
              onChange={(e) => updateField('social_facebook', e.target.value)}
              placeholder="facebook.com/restaurant"
              className="text-sm"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">TikTok</Label>
            <Input
              value={local.social_tiktok}
              onChange={(e) => updateField('social_tiktok', e.target.value)}
              placeholder="@restaurantnaam"
              className="text-sm"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    </NestoCard>
  );
}
