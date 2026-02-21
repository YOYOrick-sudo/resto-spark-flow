import { useState, useEffect } from 'react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Check } from 'lucide-react';
import { useMarketingBrandKit, useUpdateMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { nestoToast } from '@/lib/nestoToast';

const FREQUENCY_OPTIONS = [
  { value: '3', label: '1 per 3 dagen' },
  { value: '5', label: '1 per 5 dagen' },
  { value: '7', label: '1 per 7 dagen' },
  { value: '14', label: '1 per 14 dagen' },
];

interface AlgemeenTabProps {
  readOnly: boolean;
}

export default function AlgemeenTab({ readOnly }: AlgemeenTabProps) {
  const { data: brandKit, isLoading } = useMarketingBrandKit();
  const updateBrandKit = useUpdateMarketingBrandKit();
  const isMarketingEnabled = useEntitlement('marketing');
  const [saved, setSaved] = useState(false);

  const [frequency, setFrequency] = useState('7');
  const [sendTime, setSendTime] = useState('10:00');

  useEffect(() => {
    if (brandKit) {
      setFrequency(String(brandKit.max_email_frequency_days ?? 7));
      setSendTime(brandKit.default_send_time ?? '10:00');
    }
  }, [brandKit]);

  const debouncedSave = useDebouncedCallback((updates: Record<string, any>) => {
    updateBrandKit.mutate(updates, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
      onError: () => nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.'),
    });
  }, 800);

  if (isLoading) return <CardSkeleton lines={4} />;

  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold">Algemene instellingen</h3>
        <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check className="h-3 w-3" />
          Opgeslagen
        </span>
      </div>

      <div className="bg-secondary/50 rounded-card p-4 space-y-4">
        {/* Module status */}
        <div>
          <Label className="text-sm mb-1.5">Module status</Label>
          <div className="mt-1">
            <NestoBadge variant={isMarketingEnabled ? 'primary' : 'default'} size="sm">
              {isMarketingEnabled ? 'Actief' : 'Inactief'}
            </NestoBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            De marketing module status wordt beheerd via je abonnement.
          </p>
        </div>

        {/* Email frequency */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Label className="text-sm">Maximale email frequentie</Label>
            <FieldHelp>
              <p className="text-muted-foreground">Hoe vaak een individuele gast maximaal marketing emails ontvangt.</p>
            </FieldHelp>
          </div>
          <NestoSelect
            value={frequency}
            onValueChange={(v) => {
              setFrequency(v);
              if (!readOnly) debouncedSave({ max_email_frequency_days: parseInt(v) });
            }}
            options={FREQUENCY_OPTIONS}
            disabled={readOnly}
            className="w-[200px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Wordt gebruikt door de automation engine en campagne scheduler.
          </p>
        </div>

        {/* Default send time */}
        <div>
          <Label className="text-sm mb-1.5">Standaard verzendtijd</Label>
          <Input
            type="time"
            value={sendTime}
            onChange={(e) => {
              setSendTime(e.target.value);
              if (!readOnly) debouncedSave({ default_send_time: e.target.value });
            }}
            disabled={readOnly}
            className="text-sm w-[140px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Standaard tijdstip voor geplande campagnes en automation flows.
          </p>
        </div>
      </div>
    </NestoCard>
  );
}
