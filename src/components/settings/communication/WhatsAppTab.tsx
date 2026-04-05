import { useState } from 'react';
import { MessageSquare, Copy, Check, Send, Wifi, WifiOff } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar/EmptyState';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nestoToast } from '@/lib/nestoToast';

export function WhatsAppTab() {
  const { currentLocation } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;
  const [copied, setCopied] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['messaging-config-wa', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data } = await supabase
        .from('messaging_config')
        .select('whatsapp_enabled, d360_api_key_encrypted')
        .eq('location_id', locationId)
        .maybeSingle();
      return data;
    },
    enabled: !!locationId,
  });

  const isConnected = !!config?.d360_api_key_encrypted;

  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState<'intro' | 'setup' | 'connected'>(
    isConnected ? 'connected' : 'intro'
  );

  // Update step when data loads
  if (!isLoading && isConnected && step === 'intro') {
    // handled via effect below
  }

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  const saveApiKey = useMutation({
    mutationFn: async () => {
      if (!locationId || !apiKey.trim()) throw new Error('Missing data');
      const { error } = await supabase
        .from('messaging_config')
        .upsert({
          location_id: locationId,
          d360_api_key_encrypted: apiKey.trim(),
          whatsapp_enabled: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'location_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-config-wa', locationId] });
      setStep('connected');
      nestoToast.success('WhatsApp verbonden');
    },
    onError: () => {
      nestoToast.error('Opslaan mislukt');
    },
  });

  const toggleWhatsApp = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!locationId) throw new Error('No location');
      const { error } = await supabase
        .from('messaging_config')
        .update({ whatsapp_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('location_id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-config-wa', locationId] });
    },
  });

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <CardSkeleton lines={4} />;

  if (step === 'intro' && !isConnected) {
    return (
      <NestoCard className="p-8 text-center">
        <MessageSquare className="h-10 w-10 text-primary mx-auto mb-4" />
        <h3 className="text-base font-semibold text-foreground mb-2">WhatsApp verbinden</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Verbind WhatsApp om gasten via hun favoriete kanaal te bereiken. Je hebt een 360dialog account nodig.
        </p>
        <NestoButton onClick={() => setStep('setup')}>Setup starten</NestoButton>
      </NestoCard>
    );
  }

  if (step === 'setup') {
    return (
      <div className="space-y-4">
        <NestoCard className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Stap 1: 360dialog account</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Ga naar de{' '}
            <a href="https://hub.360dialog.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              360dialog Hub
            </a>
            {' '}en maak een account aan of log in.
          </p>
        </NestoCard>

        <NestoCard className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Stap 2: API key invoeren</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1.5">API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Plak je 360dialog API key"
                className="text-sm"
              />
            </div>
          </div>
        </NestoCard>

        <NestoCard className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Stap 3: Webhook URL instellen</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Kopieer deze URL en plak deze in de 360dialog Hub als webhook URL.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="text-xs font-mono"
            />
            <NestoButton size="sm" variant="outline" onClick={handleCopyWebhook}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </NestoButton>
          </div>
        </NestoCard>

        <div className="flex justify-end gap-2">
          <NestoButton variant="outline" onClick={() => setStep('intro')}>Annuleren</NestoButton>
          <NestoButton
            onClick={() => saveApiKey.mutate()}
            disabled={!apiKey.trim() || saveApiKey.isPending}
          >
            Verbinden
          </NestoButton>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">WhatsApp Business</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Wifi className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary font-medium">Verbonden</span>
            </div>
          </div>
        </div>
        <Switch
          checked={config?.whatsapp_enabled ?? false}
          onCheckedChange={(v) => toggleWhatsApp.mutate(v)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        WhatsApp is verbonden via 360dialog. Schakel de toggle uit om berichten tijdelijk te pauzeren.
      </p>
    </NestoCard>
  );
}
