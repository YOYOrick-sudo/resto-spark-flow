import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Check, ExternalLink } from 'lucide-react';
import { useMarketingBrandKit, useUpdateMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useCommunicationSettings } from '@/hooks/useCommunicationSettings';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { nestoToast } from '@/lib/nestoToast';

const isValidEmail = (email: string) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

interface EmailSettingsTabProps {
  readOnly: boolean;
}

export default function EmailSettingsTab({ readOnly }: EmailSettingsTabProps) {
  const { data: brandKit, isLoading } = useMarketingBrandKit();
  const { data: commSettings } = useCommunicationSettings();
  const updateBrandKit = useUpdateMarketingBrandKit();
  const [saved, setSaved] = useState(false);
  const [emailError, setEmailError] = useState(false);

  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');

  useEffect(() => {
    if (brandKit) {
      setSenderName(brandKit.marketing_sender_name || '');
      setReplyTo(brandKit.marketing_reply_to || '');
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
          <h3 className="text-sm font-semibold">Email Instellingen</h3>
          <FieldHelp>
            <p className="text-muted-foreground">Specifiek voor marketing emails. Algemene email instellingen worden beheerd via Communicatie.</p>
          </FieldHelp>
        </div>
        <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check className="h-3 w-3" />
          Opgeslagen
        </span>
      </div>

      <div className="bg-secondary/50 rounded-card p-4 space-y-4 mb-5">
        <div>
          <Label className="text-sm mb-1.5">Marketing afzendernaam</Label>
          <Input
            value={senderName}
            onChange={(e) => {
              setSenderName(e.target.value);
              if (!readOnly) debouncedSave({ marketing_sender_name: e.target.value || null });
            }}
            placeholder="Bijv. Restaurant De Kok — Marketing"
            className="text-sm"
            disabled={readOnly}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Afzendernaam specifiek voor marketing emails. Valt terug op de algemene afzendernaam indien leeg.
          </p>
        </div>

        <div>
          <Label className="text-sm mb-1.5">Reply-to adres</Label>
          <Input
            type="email"
            value={replyTo}
            onChange={(e) => {
              setReplyTo(e.target.value);
              const valid = isValidEmail(e.target.value);
              setEmailError(!valid);
              if (valid && !readOnly) debouncedSave({ marketing_reply_to: e.target.value || null });
            }}
            placeholder="Bijv. marketing@restaurantdekok.nl"
            className={`text-sm ${emailError ? 'border-error focus-visible:ring-error' : ''}`}
            disabled={readOnly}
          />
          {emailError ? (
            <p className="text-xs text-error mt-1">Voer een geldig emailadres in.</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Antwoorden op marketing emails worden naar dit adres gestuurd.
            </p>
          )}
        </div>
      </div>

      {/* Footer preview */}
      <div className="bg-secondary/50 rounded-card p-4 space-y-3">
        <h4 className="text-sm font-medium">Email footer preview</h4>
        <div className="rounded-card border border-border bg-background p-4 text-sm text-muted-foreground">
          {commSettings?.footer_text ? (
            <p>{commSettings.footer_text}</p>
          ) : (
            <p className="italic">Geen footer tekst ingesteld.</p>
          )}
          <p className="mt-2 text-xs underline cursor-default">Uitschrijven</p>
        </div>
        <p className="text-xs text-muted-foreground">
          De footer tekst wordt beheerd via{' '}
          <Link to="/instellingen/communicatie" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Communicatie instellingen <ExternalLink className="h-3 w-3" />
          </Link>
          . De uitschrijflink wordt automatisch toegevoegd.
        </p>
      </div>
    </NestoCard>
  );
}
