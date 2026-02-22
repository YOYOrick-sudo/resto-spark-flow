import { useState } from 'react';
import { Instagram, Globe, Store, ExternalLink } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoButton } from '@/components/polar/NestoButton';
import { StatusDot } from '@/components/polar/StatusDot';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { NestoModal } from '@/components/polar/NestoModal';
import { useMarketingSocialAccounts, type SocialPlatform, type AccountStatus } from '@/hooks/useMarketingSocialAccounts';
import { useSocialAccountMutations } from '@/hooks/useSocialAccountMutations';
import { nestoToast } from '@/lib/nestoToast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface PlatformConfig {
  platform: SocialPlatform;
  label: string;
  description: string;
  icon: React.ReactNode;
  scopes: string;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: 'instagram',
    label: 'Instagram',
    description: 'Post foto\'s, reels en carrousels naar je Instagram Business account.',
    icon: <Instagram className="h-5 w-5" />,
    scopes: 'pages_manage_posts, instagram_basic, instagram_content_publish',
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    description: 'Publiceer berichten op je Facebook pagina.',
    icon: <Globe className="h-5 w-5" />,
    scopes: 'pages_manage_posts, pages_read_engagement',
  },
  {
    platform: 'google_business',
    label: 'Google Business',
    description: 'Plaats updates op je Google Business profiel.',
    icon: <Store className="h-5 w-5" />,
    scopes: 'Google Business Profile API',
  },
];

const STATUS_MAP: Record<AccountStatus, { status: 'success' | 'warning' | 'neutral'; label: string }> = {
  active: { status: 'success', label: 'Actief' },
  expiring: { status: 'warning', label: 'Token verloopt' },
  disconnected: { status: 'neutral', label: 'Niet gekoppeld' },
};

interface SocialAccountsTabProps {
  readOnly?: boolean;
}

export default function SocialAccountsTab({ readOnly }: SocialAccountsTabProps) {
  const { accountsWithStatus, isLoading } = useMarketingSocialAccounts();
  const { disconnectAccount } = useSocialAccountMutations();
  const [disconnectPlatform, setDisconnectPlatform] = useState<SocialPlatform | null>(null);
  const [connectPlatform, setConnectPlatform] = useState<SocialPlatform | null>(null);

  const connectConfig = connectPlatform
    ? PLATFORM_CONFIGS.find((c) => c.platform === connectPlatform)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <NestoCard key={i} className="p-6 animate-pulse">
            <div className="h-12 bg-muted rounded" />
          </NestoCard>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Koppel je social media accounts om direct vanuit Nesto te publiceren.
          </p>
        </div>

        {accountsWithStatus.map((item) => {
          const config = PLATFORM_CONFIGS.find((c) => c.platform === item.platform)!;
          const statusInfo = STATUS_MAP[item.status];

          return (
            <NestoCard key={item.platform} className="p-5">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-foreground shrink-0">
                  {config.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{config.label}</p>
                    <StatusDot status={statusInfo.status} />
                    <span className="text-xs text-muted-foreground">{statusInfo.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.account
                      ? item.account.account_name
                      : config.description}
                  </p>
                  {item.status === 'expiring' && item.expiresAt && (
                    <p className="text-xs text-warning mt-0.5">
                      Token verloopt op {format(item.expiresAt, 'd MMM yyyy', { locale: nl })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {!readOnly && (
                  <div className="shrink-0">
                    {item.status === 'disconnected' ? (
                      <NestoButton
                        variant="outline"
                        size="sm"
                        onClick={() => setConnectPlatform(item.platform)}
                      >
                        Koppelen
                      </NestoButton>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.status === 'expiring' && (
                          <NestoButton
                            variant="outline"
                            size="sm"
                            onClick={() => setConnectPlatform(item.platform)}
                          >
                            Vernieuwen
                          </NestoButton>
                        )}
                        <NestoButton
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setDisconnectPlatform(item.platform)}
                        >
                          Ontkoppelen
                        </NestoButton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </NestoCard>
          );
        })}
      </div>

      {/* Disconnect confirm */}
      <ConfirmDialog
        open={!!disconnectPlatform}
        onOpenChange={(open) => !open && setDisconnectPlatform(null)}
        title="Account ontkoppelen"
        description={`Weet je zeker dat je ${
          PLATFORM_CONFIGS.find((c) => c.platform === disconnectPlatform)?.label ?? ''
        } wilt ontkoppelen? Geplande posts voor dit platform worden niet gepubliceerd.`}
        confirmLabel="Ontkoppelen"
        variant="destructive"
        onConfirm={() => {
          if (disconnectPlatform) {
            disconnectAccount.mutate(disconnectPlatform);
            setDisconnectPlatform(null);
          }
        }}
      />

      {/* Connect modal — OAuth-ready first step */}
      <NestoModal
        open={!!connectPlatform}
        onOpenChange={(open) => !open && setConnectPlatform(null)}
        title={`${connectConfig?.label ?? ''} koppelen`}
        description={`Verbind je ${connectConfig?.label ?? ''} account met Nesto om posts te publiceren.`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-accent/50 p-4 space-y-2">
            <p className="text-sm font-medium">Wat er gebeurt:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              {connectConfig?.platform === 'google_business' ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">1.</span>
                    Je wordt doorgestuurd naar Google om in te loggen
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">2.</span>
                    Geef Nesto toegang tot je Google Business profiel
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">3.</span>
                    Je wordt teruggeleid naar Nesto
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">1.</span>
                    Je wordt doorgestuurd naar Meta om in te loggen
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">2.</span>
                    Selecteer de Facebook pagina
                    {connectConfig?.platform === 'instagram' && ' (gekoppeld aan je Instagram Business account)'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">3.</span>
                    Geef Nesto de benodigde rechten
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Benodigde rechten: <span className="font-mono">{connectConfig?.scopes}</span></p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <NestoButton variant="outline" onClick={() => setConnectPlatform(null)}>
              Annuleren
            </NestoButton>
            <NestoButton
              rightIcon={<ExternalLink className="h-4 w-4" />}
              onClick={() => {
                nestoToast.warning(
                  'OAuth configuratie vereist',
                  'Neem contact op met je beheerder om de API-koppeling te configureren.'
                );
                setConnectPlatform(null);
              }}
            >
              Start koppeling
            </NestoButton>
          </div>
        </div>
      </NestoModal>
    </>
  );
}
