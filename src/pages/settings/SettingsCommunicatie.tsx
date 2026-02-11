import { useState, useEffect } from 'react';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { useCommunicationSettings, useUpdateCommunicationSettings } from '@/hooks/useCommunicationSettings';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { usePermission } from '@/hooks/usePermission';
import { EmptyState } from '@/components/polar/EmptyState';
import { Check, Mail, MessageSquare } from 'lucide-react';

interface LocalSettings {
  sender_name: string;
  reply_to: string;
  footer_text: string;
  brand_color: string;
  logo_url: string;
}

export default function SettingsCommunicatie() {
  const { data: settings, isLoading } = useCommunicationSettings();
  const updateSettings = useUpdateCommunicationSettings();
  const hasPermission = usePermission('onboarding.settings');
  const [saved, setSaved] = useState(false);

  const [local, setLocal] = useState<LocalSettings>({
    sender_name: '',
    reply_to: '',
    footer_text: '',
    brand_color: '#1d979e',
    logo_url: '',
  });

  useEffect(() => {
    if (settings) {
      setLocal({
        sender_name: settings.sender_name || '',
        reply_to: settings.reply_to || '',
        footer_text: settings.footer_text || '',
        brand_color: settings.brand_color || '#1d979e',
        logo_url: settings.logo_url || '',
      });
    }
  }, [settings]);

  const debouncedSave = useDebouncedCallback((updates: Partial<LocalSettings>) => {
    updateSettings.mutate(updates, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    });
  }, 800);

  const updateField = (field: keyof LocalSettings, value: string) => {
    const updated = { ...local, [field]: value };
    setLocal(updated);
    debouncedSave({ [field]: value });
  };

  if (!hasPermission) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <EmptyState
          title="Geen toegang"
          description="Je hebt geen rechten om communicatie-instellingen te beheren."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <SettingsDetailLayout
        title="Communicatie"
        description="Beheer de email branding, afzender en kanalen voor alle modules."
        breadcrumbs={[
          { label: 'Instellingen', path: '/instellingen/voorkeuren' },
          { label: 'Communicatie' },
        ]}
      >
        <CardSkeleton lines={5} />
      </SettingsDetailLayout>
    );
  }

  return (
    <SettingsDetailLayout
      title="Communicatie"
      description="Beheer de email branding, afzender en kanalen voor alle modules."
      breadcrumbs={[
        { label: 'Instellingen', path: '/instellingen/voorkeuren' },
        { label: 'Communicatie' },
      ]}
    >
      <NestoCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">Branding</h3>
          <span className={`flex items-center gap-1 text-xs text-primary transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <Check className="h-3 w-3" />
            Opgeslagen
          </span>
        </div>

        <div className="bg-secondary/50 rounded-card p-4 space-y-4">
          {/* Logo — prepared but disabled */}
          <div className="opacity-40 cursor-default">
            <Label className="text-sm mb-1.5">Bedrijfslogo</Label>
            <div className="h-20 border border-dashed border-border rounded-card flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Logo uploaden</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Verschijnt bovenaan elke email die vanuit het platform wordt verstuurd.
            </p>
          </div>

          {/* Brand color — prepared but disabled */}
          <div className="opacity-40 cursor-default">
            <Label className="text-sm mb-1.5">Primaire kleur</Label>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-control border border-border"
                style={{ backgroundColor: local.brand_color }}
              />
              <Input
                value={local.brand_color}
                disabled
                className="text-sm w-[120px]"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Kleur voor knoppen en accenten in emails.
            </p>
          </div>

          {/* Footer text — active */}
          <div>
            <Label className="text-sm mb-1.5">Footer tekst</Label>
            <Textarea
              value={local.footer_text}
              onChange={(e) => updateField('footer_text', e.target.value)}
              placeholder="Bijv. Restaurant De Kok — Keizersgracht 123, Amsterdam — 020 123 4567"
              className="text-sm min-h-[60px]"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Verschijnt onderaan elke email. Gebruik voor adres, telefoonnummer en website.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40 my-5" />

        {/* Section 2: Afzender */}
        <h3 className="text-sm font-semibold mb-4">Afzender</h3>

        <div className="bg-secondary/50 rounded-card p-4 space-y-4">
          <div>
            <Label className="text-sm mb-1.5">Afzendernaam</Label>
            <Input
              value={local.sender_name}
              onChange={(e) => updateField('sender_name', e.target.value)}
              placeholder="Bijv. Restaurant De Kok"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deze naam verschijnt als afzender in emails naar kandidaten.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Label className="text-sm">Reply-to adres</Label>
              <FieldHelp>
                <p className="text-muted-foreground">Het afzenderdomein (@nesto.app) wordt beheerd op platform-niveau en is niet per locatie aanpasbaar.</p>
              </FieldHelp>
            </div>
            <Input
              type="email"
              value={local.reply_to}
              onChange={(e) => updateField('reply_to', e.target.value)}
              placeholder="Bijv. info@restaurantdekok.nl"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Antwoorden van kandidaten worden naar dit adres gestuurd.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40 my-5" />

        {/* Section 3: Kanalen */}
        <h3 className="text-sm font-semibold mb-4">Kanalen</h3>

        <div className="bg-secondary/50 rounded-card p-4 space-y-3">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Email</span>
            </div>
            <NestoBadge variant="primary" size="sm">Actief</NestoBadge>
          </div>

          <div className="flex items-center justify-between py-1 opacity-40 cursor-default">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">WhatsApp</span>
            </div>
            <NestoBadge variant="default" size="sm">Binnenkort</NestoBadge>
          </div>
        </div>
      </NestoCard>
    </SettingsDetailLayout>
  );
}
