import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Palette, Share2, CheckCircle2 } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoInput } from '@/components/polar/NestoInput';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateMarketingBrandKit } from '@/hooks/useMarketingBrandKit';
import { useMarketingSocialAccounts } from '@/hooks/useMarketingSocialAccounts';
import { useInstagramOnboarding } from '@/hooks/useInstagramOnboarding';
import SocialAccountsTab from '@/components/marketing/settings/SocialAccountsTab';
import { cn } from '@/lib/utils';

const TONE_OPTIONS = [
  { value: 'professioneel', label: 'Professioneel' },
  { value: 'vriendelijk', label: 'Vriendelijk' },
  { value: 'casual', label: 'Casual' },
  { value: 'speels', label: 'Speels' },
];

const STEPS = [
  { icon: Sparkles, label: 'Welkom' },
  { icon: Palette, label: 'Stijl' },
  { icon: Share2, label: 'Social' },
  { icon: CheckCircle2, label: 'Klaar' },
];

export function MarketingOnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const updateBrandKit = useUpdateMarketingBrandKit();
  const { accountsWithStatus } = useMarketingSocialAccounts();
  const onboardInstagram = useInstagramOnboarding();

  // Brand kit form state
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [toneDescription, setToneDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');

  // Instagram detection via shared React Query cache
  const prevInstagramRef = useRef(false);
  const [instagramConnected, setInstagramConnected] = useState(false);

  useEffect(() => {
    const ig = accountsWithStatus.find((a) => a.platform === 'instagram');
    const isActive = ig?.status === 'active';
    if (isActive && !prevInstagramRef.current && ig?.account?.account_id) {
      onboardInstagram.mutate({ account_id: ig.account.account_id });
      setInstagramConnected(true);
    }
    prevInstagramRef.current = !!isActive;
  }, [accountsWithStatus]);

  async function handleBrandKitSave() {
    await updateBrandKit.mutateAsync({
      tone_of_voice: toneOfVoice || null,
      tone_description: toneDescription || null,
      primary_color: primaryColor || null,
    });
    setStep(2);
  }

  function handleFinish() {
    navigate('/marketing', { replace: true });
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-full border-2 transition-colors',
                    i <= step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-8 sm:w-12 h-0.5',
                      i < step ? 'bg-primary' : 'bg-muted-foreground/20'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="w-full max-w-md">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Marketing instellen</h1>
                <p className="text-muted-foreground">
                  In 3 stappen is je marketing klaar. De AI leert je stijl en helpt je groeien.
                </p>
              </div>
              <NestoButton size="lg" onClick={() => setStep(1)}>
                Start
              </NestoButton>
            </div>
          )}

          {/* Step 1: Brand Kit */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-foreground">Je merk stijl</h2>
                <p className="text-sm text-muted-foreground">
                  Dit helpt de AI om content te schrijven die bij je past.
                </p>
              </div>

              <NestoSelect
                label="Tone of voice"
                placeholder="Kies je stijl..."
                value={toneOfVoice}
                onValueChange={setToneOfVoice}
                options={TONE_OPTIONS}
              />

              <div className="space-y-2">
                <label className="text-label text-muted-foreground block">Beschrijving (optioneel)</label>
                <Textarea
                  value={toneDescription}
                  onChange={(e) => setToneDescription(e.target.value)}
                  placeholder="Beschrijf je stijl in eigen woorden..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-label text-muted-foreground block">Primaire kleur</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer"
                  />
                  <NestoInput
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Logo upload beschikbaar via Instellingen → Communicatie
              </p>

              <NestoButton
                className="w-full"
                onClick={handleBrandKitSave}
                isLoading={updateBrandKit.isPending}
                disabled={!toneOfVoice}
              >
                Volgende
              </NestoButton>
            </div>
          )}

          {/* Step 2: Social Accounts */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-foreground">Social accounts</h2>
                <p className="text-sm text-muted-foreground">
                  Koppel je accounts om direct vanuit Nesto te posten.
                </p>
              </div>

              <SocialAccountsTab />

              <div className="flex flex-col gap-3">
                <NestoButton className="w-full" onClick={() => setStep(3)}>
                  Volgende
                </NestoButton>
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Overslaan — ik doe dit later
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Je marketing is klaar!</h1>
                <div className="text-sm text-muted-foreground space-y-1">
                  {toneOfVoice && <p>Tone of voice: <span className="text-foreground font-medium">{toneOfVoice}</span></p>}
                  {instagramConnected && (
                    <p className="text-primary">
                      We importeren je Instagram posts en leren je stijl. Dit duurt even.
                    </p>
                  )}
                </div>
              </div>
              <NestoButton size="lg" onClick={handleFinish}>
                Ga naar Dashboard
              </NestoButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
