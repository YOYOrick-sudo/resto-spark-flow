import { useState, useEffect, useRef } from 'react';
import { SettingsDetailLayout } from '@/components/settings/layouts/SettingsDetailLayout';
import { NestoCard } from '@/components/polar/NestoCard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldHelp } from '@/components/polar/FieldHelp';
import { TitleHelp } from '@/components/polar/TitleHelp';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { useCommunicationSettings, useUpdateCommunicationSettings } from '@/hooks/useCommunicationSettings';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { usePermission } from '@/hooks/usePermission';
import { EmptyState } from '@/components/polar/EmptyState';
import { nestoToast } from '@/lib/nestoToast';
import { LogoUploadField } from '@/components/settings/communication/LogoUploadField';
import { Check, Mail, MessageSquare } from 'lucide-react';

const isValidEmail = (email: string) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);

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
  const [emailError, setEmailError] = useState(false);
  const [colorError, setColorError] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

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
      onError: () => {
        nestoToast.error('Opslaan mislukt', 'Probeer het opnieuw.');
      },
    });
  }, 800);

  const updateField = (field: keyof LocalSettings, value: string) => {
    const updated = { ...local, [field]: value };
    setLocal(updated);

    if (field === 'reply_to') {
      const valid = isValidEmail(value);
      setEmailError(!valid);
      if (!valid) return;
    }

    if (field === 'brand_color') {
      const valid = isValidHex(value);
      setColorError(!valid);
      if (!valid) return;
    }

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

  const titleWithHelp = (
    <span className="flex items-center gap-2">
      Communicatie
      <TitleHelp title="Communicatie-instellingen">
        <p className="text-muted-foreground">
          Deze instellingen gelden voor alle uitgaande communicatie vanuit het platform — onboarding, reserveringen en notificaties.
        </p>
        <p className="text-muted-foreground">
          Het afzenderdomein (@nesto.app) wordt op platform-niveau beheerd en is niet per locatie aanpasbaar.
        </p>
      </TitleHelp>
    </span>
  );

  if (isLoading) {
    return (
      <SettingsDetailLayout
        title={titleWithHelp}
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
      title={titleWithHelp}
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
          {/* Logo upload */}
          <LogoUploadField logoUrl={local.logo_url || null} />

          {/* Brand color — active */}
          <div>
            <Label className="text-sm mb-1.5">Primaire kleur</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className="h-8 w-8 rounded-control border border-border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow"
                style={{ backgroundColor: isValidHex(local.brand_color) ? local.brand_color : '#1d979e' }}
                title="Klik om kleur te kiezen"
              />
              <Input
                value={local.brand_color}
                onChange={(e) => updateField('brand_color', e.target.value)}
                className={`text-sm w-[120px] ${colorError ? 'border-error focus-visible:ring-error' : ''}`}
                placeholder="#1d979e"
                maxLength={7}
              />
              <input
                ref={colorInputRef}
                type="color"
                value={isValidHex(local.brand_color) ? local.brand_color : '#1d979e'}
                onChange={(e) => updateField('brand_color', e.target.value)}
                className="sr-only"
                tabIndex={-1}
              />
            </div>
            {colorError ? (
              <p className="text-xs text-error mt-1">Voer een geldige hex kleurcode in (bijv. #1d979e).</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Kleur voor knoppen en accenten in emails.
              </p>
            )}
          </div>

          {/* Footer text */}
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
              className={`text-sm ${emailError ? 'border-error focus-visible:ring-error' : ''}`}
            />
            {emailError ? (
              <p className="text-xs text-error mt-1">Voer een geldig emailadres in.</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Antwoorden van kandidaten worden naar dit adres gestuurd.
              </p>
            )}
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
              <div>
                <span className="text-sm">Email</span>
                <p className="text-xs text-muted-foreground">Automatische berichten, templates en notificaties</p>
              </div>
            </div>
            <NestoBadge variant="primary" size="sm">Actief</NestoBadge>
          </div>

          <div className="flex items-center justify-between py-1 opacity-40 cursor-default">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm">WhatsApp</span>
                <p className="text-xs text-muted-foreground">Directe berichten via WhatsApp Business</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Binnenkort beschikbaar</span>
          </div>
        </div>
      </NestoCard>
    </SettingsDetailLayout>
  );
}
