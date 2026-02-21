import { useState, useEffect } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Check, ShieldCheck } from 'lucide-react';
import { useMarketingBrandKit, useUpdateMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useGDPRStats } from '@/hooks/useMarketingGDPR';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { nestoToast } from '@/lib/nestoToast';

interface GDPRTabProps {
  readOnly: boolean;
}

export default function GDPRTab({ readOnly }: GDPRTabProps) {
  const { data: brandKit, isLoading } = useMarketingBrandKit();
  const { data: gdprStats } = useGDPRStats();
  const updateBrandKit = useUpdateMarketingBrandKit();
  const [saved, setSaved] = useState(false);

  const [consentText, setConsentText] = useState('');
  const [doubleOptIn, setDoubleOptIn] = useState(true);

  useEffect(() => {
    if (brandKit) {
      setConsentText(brandKit.gdpr_consent_text || '');
      setDoubleOptIn(brandKit.double_opt_in_enabled ?? true);
    }
  }, [brandKit]);

  const debouncedSave = useDebouncedCallback((updates: Record<string, any>) => {
    updateBrandKit.mutate(updates, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
      onError: () => nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.'),
    });
  }, 800);

  if (isLoading) return <CardSkeleton lines={4} />;

  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">GDPR & Privacy</h3>
        </div>
        <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check className="h-3 w-3" />
          Opgeslagen
        </span>
      </div>

      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        {/* Consent text */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Label className="text-sm">Consent tekst</Label>
            <FieldHelp>
              <p className="text-muted-foreground">Deze tekst wordt getoond bij het opt-in formulier voor marketing emails.</p>
            </FieldHelp>
          </div>
          <Textarea
            value={consentText}
            onChange={(e) => {
              setConsentText(e.target.value);
              if (!readOnly) debouncedSave({ gdpr_consent_text: e.target.value || null });
            }}
            placeholder="Bijv. Ik ga akkoord met het ontvangen van marketing emails en aanbiedingen. Je kunt je op elk moment uitschrijven."
            className="text-sm min-h-[80px]"
            rows={3}
            disabled={readOnly}
          />
        </div>

        {/* Double opt-in */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Double opt-in</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nieuwe abonnees moeten hun email bevestigen voordat ze marketing ontvangen.
            </p>
          </div>
          <Switch
            checked={doubleOptIn}
            onCheckedChange={(checked) => {
              setDoubleOptIn(checked);
              if (!readOnly) debouncedSave({ double_opt_in_enabled: checked });
            }}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Suppression stats */}
      <div className="bg-secondary/50 rounded-card p-4">
        <h4 className="text-sm font-medium mb-3">Suppressielijst</h4>
        {gdprStats && gdprStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {gdprStats.map((stat) => (
              <div key={stat.channel} className="rounded-card border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground capitalize">{stat.channel}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-semibold">{stat.opted_out}</span>
                  <span className="text-xs text-muted-foreground">uitgeschreven</span>
                </div>
                <span className="text-xs text-muted-foreground">{stat.opted_in} actief van {stat.total} totaal</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nog geen data — deze statistieken vullen zich zodra marketing campagnes worden verstuurd.
          </p>
        )}
      </div>
    </NestoCard>
  );
}
