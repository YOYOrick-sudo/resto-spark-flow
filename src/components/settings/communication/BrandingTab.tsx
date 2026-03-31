import { useState, useEffect, useRef, useCallback } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Check, Trash2, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { useLocationBranding, useUpdateLocationBranding } from '@/hooks/useLocationBranding';
import { useBrandAssetUpload } from '@/hooks/useBrandAssetUpload';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { getTonePreviewText } from '@/utils/branding';
import { nestoToast } from '@/lib/nestoToast';
import { cn } from '@/lib/utils';

const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);

const TONE_OPTIONS = [
  { value: 'formeel', label: 'Formeel' },
  { value: 'informeel', label: 'Informeel' },
  { value: 'casual', label: 'Casual' },
] as const;

export function BrandingTab() {
  const { data: branding, isLoading } = useLocationBranding();
  const updateBranding = useUpdateLocationBranding();
  const { uploadAsset, deleteAsset, isUploading } = useBrandAssetUpload();
  const [saved, setSaved] = useState(false);

  const [local, setLocal] = useState({
    brand_color_primary: '#0F766E',
    brand_color_secondary: '#F0FDFA',
    tone_of_voice: 'informeel',
    guest_greeting: '',
    description_short: '',
  });

  const [colorError, setColorError] = useState(false);
  const [secondaryColorError, setSecondaryColorError] = useState(false);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const secondaryColorRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteLogo, setConfirmDeleteLogo] = useState(false);
  const [confirmDeleteHero, setConfirmDeleteHero] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [heroDragOver, setHeroDragOver] = useState(false);

  useEffect(() => {
    if (branding) {
      setLocal({
        brand_color_primary: branding.brand_color_primary,
        brand_color_secondary: branding.brand_color_secondary,
        tone_of_voice: branding.tone_of_voice,
        guest_greeting: branding.guest_greeting || '',
        description_short: branding.description_short || '',
      });
    }
  }, [branding]);

  const debouncedSave = useDebouncedCallback((updates: Record<string, string | null>) => {
    updateBranding.mutate(updates as any, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
      onError: () => nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.'),
    });
  }, 800);

  const updateField = (field: string, value: string) => {
    setLocal((prev) => ({ ...prev, [field]: value }));

    if (field === 'brand_color_primary') {
      const valid = isValidHex(value);
      setColorError(!valid);
      if (!valid) return;
    }
    if (field === 'brand_color_secondary') {
      const valid = isValidHex(value);
      setSecondaryColorError(!valid);
      if (!valid) return;
    }

    debouncedSave({ [field]: value });
  };

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setLogoDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadAsset(file, 'logo');
  }, [uploadAsset]);

  const handleHeroDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setHeroDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadAsset(file, 'hero');
  }, [uploadAsset]);

  if (isLoading) return <CardSkeleton lines={6} />;

  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">Restaurant branding</h3>
          <FieldHelp>
            <p className="text-muted-foreground">Logo, kleuren en tone of voice die overal in het platform worden gebruikt — emails, widget, en straks de AI-assistent.</p>
          </FieldHelp>
        </div>
        <span className={cn('flex items-center gap-1 text-xs text-primary transition-opacity duration-200', saved ? 'opacity-100' : 'opacity-0')}>
          <Check className="h-3 w-3" />
          Opgeslagen
        </span>
      </div>

      <div className="bg-secondary/50 rounded-card p-4 space-y-5">
        {/* Logo */}
        <div>
          <Label className="text-sm mb-1.5">Logo</Label>
          {isUploading ? (
            <Skeleton className="h-20 w-full rounded-card" />
          ) : branding?.logo_url ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="h-20 px-4 border border-border rounded-card flex items-center justify-center bg-background hover:bg-secondary/40 transition-colors cursor-pointer"
              >
                <img src={branding.logo_url} alt="Logo" className="max-h-16 max-w-[200px] object-contain" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteLogo(true)}
                className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-control"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => logoRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && logoRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setLogoDragOver(true); }}
              onDragLeave={() => setLogoDragOver(false)}
              onDrop={handleLogoDrop}
              className={cn(
                'h-20 border border-dashed rounded-card flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors',
                logoDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/30',
              )}
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sleep een logo hierheen of klik om te uploaden</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG of SVG. Max 2 MB. Wordt overal gebruikt.</p>
          <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'logo'); }} />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm mb-1.5">Primaire kleur</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => primaryColorRef.current?.click()}
                className="h-8 w-8 rounded-control border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
                style={{ backgroundColor: isValidHex(local.brand_color_primary) ? local.brand_color_primary : '#0F766E' }}
              />
              <Input
                value={local.brand_color_primary}
                onChange={(e) => updateField('brand_color_primary', e.target.value)}
                className={cn('text-sm w-[120px]', colorError && 'border-error focus-visible:ring-error')}
                maxLength={7}
              />
              <input ref={primaryColorRef} type="color" value={isValidHex(local.brand_color_primary) ? local.brand_color_primary : '#0F766E'} onChange={(e) => updateField('brand_color_primary', e.target.value)} className="sr-only" tabIndex={-1} />
            </div>
            {colorError && <p className="text-xs text-error mt-1">Ongeldige hex kleurcode.</p>}
          </div>
          <div>
            <Label className="text-sm mb-1.5">Secundaire kleur</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => secondaryColorRef.current?.click()}
                className="h-8 w-8 rounded-control border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
                style={{ backgroundColor: isValidHex(local.brand_color_secondary) ? local.brand_color_secondary : '#F0FDFA' }}
              />
              <Input
                value={local.brand_color_secondary}
                onChange={(e) => updateField('brand_color_secondary', e.target.value)}
                className={cn('text-sm w-[120px]', secondaryColorError && 'border-error focus-visible:ring-error')}
                maxLength={7}
              />
              <input ref={secondaryColorRef} type="color" value={isValidHex(local.brand_color_secondary) ? local.brand_color_secondary : '#F0FDFA'} onChange={(e) => updateField('brand_color_secondary', e.target.value)} className="sr-only" tabIndex={-1} />
            </div>
            {secondaryColorError && <p className="text-xs text-error mt-1">Ongeldige hex kleurcode.</p>}
          </div>
        </div>

        {/* Tone of voice */}
        <div>
          <Label className="text-sm mb-1.5">Tone of voice</Label>
          <div className="flex gap-2">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField('tone_of_voice', opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-control text-sm font-medium border transition-colors',
                  local.tone_of_voice === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-secondary/40',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground italic">
              {getTonePreviewText(local.tone_of_voice)}
            </p>
          </div>
        </div>

        {/* Hero image */}
        <div>
          <Label className="text-sm mb-1.5">Sfeerbeeld</Label>
          {branding?.hero_image_url ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => heroRef.current?.click()}
                className="h-24 w-full max-w-[300px] border border-border rounded-card flex items-center justify-center bg-background hover:bg-secondary/40 transition-colors cursor-pointer overflow-hidden"
              >
                <img src={branding.hero_image_url} alt="Sfeerbeeld" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteHero(true)}
                className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-control"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => heroRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && heroRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setHeroDragOver(true); }}
              onDragLeave={() => setHeroDragOver(false)}
              onDrop={handleHeroDrop}
              className={cn(
                'h-20 border border-dashed rounded-card flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors',
                heroDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/30',
              )}
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sleep een afbeelding hierheen of klik</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Wordt gebruikt als header in marketing emails en widgets.</p>
          <input ref={heroRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'hero'); }} />
        </div>

        {/* Guest greeting */}
        <div>
          <Label className="text-sm mb-1.5">Begroeting voor gasten</Label>
          <Input
            value={local.guest_greeting}
            onChange={(e) => updateField('guest_greeting', e.target.value)}
            placeholder="Bijv. Welkom bij Restaurant De Kok"
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Wordt gebruikt in de widget en bevestigingsmails.</p>
        </div>

        {/* Short description */}
        <div>
          <Label className="text-sm mb-1.5">Korte beschrijving</Label>
          <Textarea
            value={local.description_short}
            onChange={(e) => updateField('description_short', e.target.value)}
            placeholder="Bijv. Seizoensgebonden Frans-Italiaans in het hart van Amsterdam"
            className="text-sm min-h-[60px]"
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-1">Verschijnt in de widget en wordt gebruikt door de AI-assistent.</p>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmDeleteLogo}
        onOpenChange={setConfirmDeleteLogo}
        title="Logo verwijderen"
        description="Weet je zeker dat je het logo wilt verwijderen? Het wordt overal verwijderd."
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={() => { setConfirmDeleteLogo(false); deleteAsset('logo'); }}
      />
      <ConfirmDialog
        open={confirmDeleteHero}
        onOpenChange={setConfirmDeleteHero}
        title="Sfeerbeeld verwijderen"
        description="Weet je zeker dat je het sfeerbeeld wilt verwijderen?"
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={() => { setConfirmDeleteHero(false); deleteAsset('hero'); }}
      />
    </NestoCard>
  );
}
