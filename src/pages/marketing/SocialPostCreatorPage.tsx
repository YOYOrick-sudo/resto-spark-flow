import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoTabs } from '@/components/polar/NestoTabs';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMarketingSocialAccounts, type SocialPlatform } from '@/hooks/useMarketingSocialAccounts';
import { useCreateFullSocialPost, usePublishSocialPost } from '@/hooks/useAllSocialPosts';
import { useGenerateSocialContent } from '@/hooks/useGenerateContent';
import { nestoToast } from '@/lib/nestoToast';
import { cn } from '@/lib/utils';
import { SocialPreviewPanel } from '@/components/marketing/social/SocialPreviewPanel';

const PLATFORMS: { id: SocialPlatform; label: string; color: string; maxChars: number }[] = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C', maxChars: 2200 },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', maxChars: 63206 },
  { id: 'google_business', label: 'Google Business', color: '#34A853', maxChars: 1500 },
];

const CONTENT_TYPES = [
  { value: 'none', label: 'Geen type' },
  { value: 'food_shot', label: 'Food shot' },
  { value: 'behind_the_scenes', label: 'Behind the scenes' },
  { value: 'team', label: 'Team' },
  { value: 'ambiance', label: 'Ambiance' },
  { value: 'seasonal', label: 'Seizoen' },
  { value: 'promo', label: 'Promo' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}));

const MINUTES = [
  { value: '00', label: '00' },
  { value: '15', label: '15' },
  { value: '30', label: '30' },
  { value: '45', label: '45' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Dagelijks' },
  { value: 'weekly', label: 'Wekelijks' },
  { value: 'monthly', label: 'Maandelijks' },
];

const DAY_OPTIONS = [
  { value: '1', label: 'Maandag' },
  { value: '2', label: 'Dinsdag' },
  { value: '3', label: 'Woensdag' },
  { value: '4', label: 'Donderdag' },
  { value: '5', label: 'Vrijdag' },
  { value: '6', label: 'Zaterdag' },
  { value: '0', label: 'Zondag' },
];

type PublishMode = 'now' | 'schedule';

export default function SocialPostCreatorPage() {
  const navigate = useNavigate();
  const { accountsWithStatus } = useMarketingSocialAccounts();
  const createPost = useCreateFullSocialPost();
  const publishPost = usePublishSocialPost();
  const generateContent = useGenerateSocialContent();

  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [caption, setCaption] = useState('');
  const [platformCaptions, setPlatformCaptions] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [perPlatformMode, setPerPlatformMode] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [timingSuggestion, setTimingSuggestion] = useState<{ time?: string; day?: string } | null>(null);
  const [contentType, setContentType] = useState('none');
  const [publishMode, setPublishMode] = useState<PublishMode>('schedule');
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [alternativeCaption, setAltCaption] = useState('');
  const [showAltCaption, setShowAltCaption] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiContext, setAiContext] = useState('');

  const charLimit = useMemo(() => {
    if (selectedPlatforms.length === 0) return null;
    const limits = selectedPlatforms.map((p) => PLATFORMS.find((pl) => pl.id === p)?.maxChars ?? Infinity);
    return Math.min(...limits);
  }, [selectedPlatforms]);

  const overLimit = charLimit !== null && caption.length > charLimit;
  const hasInstagram = selectedPlatforms.includes('instagram');

  function togglePlatform(platform: SocialPlatform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  const hashtagList = hashtags
    .split(/[,\s]+/)
    .map((h) => h.replace(/^#/, '').trim())
    .filter(Boolean);

  function handleCaptionChange(value: string) {
    setCaption(value);
    if (!perPlatformMode) {
      // Sync to all platforms
      const updated: Partial<Record<SocialPlatform, string>> = {};
      selectedPlatforms.forEach((p) => { updated[p] = value; });
      setPlatformCaptions(updated);
    }
  }

  function handlePlatformCaptionChange(platform: SocialPlatform, value: string) {
    setPlatformCaptions((prev) => ({ ...prev, [platform]: value }));
  }

  function addSuggestedHashtag(tag: string) {
    const current = hashtags.trim();
    const separator = current ? ', ' : '';
    setHashtags(current + separator + tag);
    setSuggestedHashtags((prev) => prev.filter((h) => h !== tag));
  }

  async function handleAIGenerate() {
    if (selectedPlatforms.length === 0) return;

    try {
      const result = await generateContent.mutateAsync({
        context: aiContext || undefined,
        platforms: selectedPlatforms,
        content_type_tag: contentType === 'none' ? undefined : contentType,
      });

      // Set per-platform captions
      const newCaptions: Partial<Record<SocialPlatform, string>> = {};
      if (result.platforms.instagram?.caption) {
        newCaptions.instagram = result.platforms.instagram.caption;
        // Also set hashtags from instagram result
        if (result.platforms.instagram.hashtags?.length) {
          setHashtags(result.platforms.instagram.hashtags.join(', '));
        }
      }
      if (result.platforms.facebook?.caption) {
        newCaptions.facebook = result.platforms.facebook.caption;
      }
      if (result.platforms.google_business?.caption) {
        newCaptions.google_business = result.platforms.google_business.caption;
      }

      setPlatformCaptions(newCaptions);
      // Set the main caption to the first platform's caption
      const firstPlatform = selectedPlatforms[0];
      setCaption(newCaptions[firstPlatform] ?? '');

      // Enable per-platform mode if we have multiple platforms
      if (selectedPlatforms.length > 1) {
        setPerPlatformMode(true);
        setActivePlatformTab(selectedPlatforms[0]);
      }

      // Hashtag suggestions
      if (result.suggested_hashtags?.length) {
        setSuggestedHashtags(result.suggested_hashtags.slice(0, 10));
      }

      // Timing suggestion
      if (result.suggested_time || result.suggested_day) {
        setTimingSuggestion({ time: result.suggested_time, day: result.suggested_day });
      }

      setAiModalOpen(false);
      setAiContext('');
      nestoToast.success('Content gegenereerd');
    } catch {
      // Error handling is in the hook
    }
  }

  function getCaptionForPlatform(platform: SocialPlatform): string {
    return platformCaptions[platform] ?? caption;
  }

  async function handleSubmit(status: 'draft' | 'scheduled') {
    if (selectedPlatforms.length === 0) {
      nestoToast.error('Selecteer minstens één platform');
      return;
    }
    if (status !== 'draft' && !caption.trim() && !Object.values(platformCaptions).some((c) => c?.trim())) {
      nestoToast.error('Voer een bericht in');
      return;
    }

    setSubmitting(true);
    try {
      let scheduledAt: string | undefined;
      if (status === 'scheduled' && publishMode === 'schedule') {
        const d = new Date(scheduleDate);
        scheduledAt = setMinutes(setHours(d, parseInt(hour)), parseInt(minute)).toISOString();
      } else if (status === 'scheduled' && publishMode === 'now') {
        scheduledAt = new Date().toISOString();
      }

      const recurrenceRule = isRecurring
        ? { frequency, day: parseInt(dayOfWeek), time: `${hour}:${minute}` }
        : undefined;

      for (const platform of selectedPlatforms) {
        const platformCaption = getCaptionForPlatform(platform);
        const result = await createPost.mutateAsync({
          platform,
          content_text: platformCaption,
          hashtags: hashtagList,
          scheduled_at: scheduledAt,
          content_type_tag: contentType === 'none' ? undefined : contentType,
          status,
          is_recurring: isRecurring,
          recurrence_rule: recurrenceRule,
          alternative_caption: alternativeCaption || undefined,
        });

        if (publishMode === 'now' && status === 'scheduled') {
          try {
            await publishPost.mutateAsync(result.id);
          } catch {
            nestoToast.error(`Publiceren naar ${platform} mislukt`);
          }
        }
      }

      if (status === 'draft') {
        nestoToast.success('Concept opgeslagen');
      } else if (publishMode === 'now') {
        nestoToast.success('Bericht gepubliceerd');
      } else {
        nestoToast.success(`Bericht ingepland voor ${hour}:${minute}`);
      }
      navigate('/marketing/social');
    } catch {
      nestoToast.error('Opslaan mislukt');
    } finally {
      setSubmitting(false);
    }
  }

  const platformTabs = selectedPlatforms.map((p) => ({
    id: p,
    label: PLATFORMS.find((pl) => pl.id === p)?.label ?? p,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nieuw bericht"
        actions={
          <div className="flex gap-2">
            <NestoButton variant="ghost" onClick={() => navigate('/marketing/social')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug
            </NestoButton>
            <NestoButton variant="outline" onClick={() => handleSubmit('draft')} disabled={submitting}>
              Opslaan als concept
            </NestoButton>
            <NestoButton onClick={() => handleSubmit('scheduled')} disabled={submitting || overLimit}>
              {publishMode === 'now' ? 'Nu publiceren' : 'Inplannen'}
            </NestoButton>
          </div>
        }
      />

      <div className="flex gap-6">
        {/* Left: form */}
        <div className="flex-1 space-y-6 max-w-2xl">
          {/* Platform selection */}
          <PlatformSelector
            accountsWithStatus={accountsWithStatus}
            selectedPlatforms={selectedPlatforms}
            togglePlatform={togglePlatform}
          />

          {hasInstagram && (
            <InfoAlert
              variant="info"
              title="Stories niet ondersteund via API"
              description="Stories kun je direct via de Instagram app posten. De API ondersteunt alleen feed posts."
            />
          )}

          {/* Caption */}
          <CaptionSection
            caption={caption}
            onCaptionChange={handleCaptionChange}
            charLimit={charLimit}
            overLimit={overLimit}
            selectedPlatforms={selectedPlatforms}
            perPlatformMode={perPlatformMode}
            setPerPlatformMode={setPerPlatformMode}
            platformCaptions={platformCaptions}
            onPlatformCaptionChange={handlePlatformCaptionChange}
            platformTabs={platformTabs}
            activePlatformTab={activePlatformTab}
            setActivePlatformTab={setActivePlatformTab}
            showAltCaption={showAltCaption}
            setShowAltCaption={setShowAltCaption}
            alternativeCaption={alternativeCaption}
            setAltCaption={setAltCaption}
            onAIClick={() => setAiModalOpen(true)}
            aiDisabled={selectedPlatforms.length === 0}
            aiLoading={generateContent.isPending}
          />

          {/* Hashtags */}
          <section className="space-y-2">
            <label className="text-sm font-medium">Hashtags</label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="#restaurant #food #chef"
            />
            {suggestedHashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-xs text-muted-foreground mr-1">Suggesties:</span>
                {suggestedHashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addSuggestedHashtag(tag)}
                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Content type */}
          <section className="space-y-2">
            <label className="text-sm font-medium">Content type</label>
            <NestoSelect value={contentType} onValueChange={setContentType} options={CONTENT_TYPES} placeholder="Selecteer type..." />
          </section>

          {/* Media placeholder */}
          <section className="border border-dashed border-border/50 rounded-xl p-6 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Media upload beschikbaar in Sprint 3</span>
          </section>

          {/* Publish mode */}
          <PublishSection
            publishMode={publishMode}
            setPublishMode={setPublishMode}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            hour={hour}
            setHour={setHour}
            minute={minute}
            setMinute={setMinute}
            timingSuggestion={timingSuggestion}
          />

          {/* Recurring */}
          <section className="space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center gap-3">
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              <label className="text-sm font-medium">Herhaalpost</label>
            </div>
            {isRecurring && (
              <div className="flex gap-3 pl-12">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Frequentie</label>
                  <NestoSelect value={frequency} onValueChange={setFrequency} options={FREQUENCY_OPTIONS} />
                </div>
                {frequency === 'weekly' && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Dag</label>
                    <NestoSelect value={dayOfWeek} onValueChange={setDayOfWeek} options={DAY_OPTIONS} />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right: live preview */}
        <div className="w-96 shrink-0 hidden lg:block">
          <SocialPreviewPanel
            platforms={selectedPlatforms}
            caption={caption}
            hashtags={hashtagList}
            platformCaptions={platformCaptions}
          />
        </div>
      </div>

      {/* AI Generate Modal */}
      <NestoModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        title="AI schrijven"
        description="Beschrijf het onderwerp en AI schrijft per platform een unieke caption."
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <NestoButton variant="outline" onClick={() => setAiModalOpen(false)}>
              Annuleren
            </NestoButton>
            <NestoButton
              onClick={handleAIGenerate}
              disabled={generateContent.isPending}
            >
              {generateContent.isPending ? 'Genereren...' : 'Genereer'}
            </NestoButton>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="text-sm font-medium">Waar gaat deze post over?</label>
          <textarea
            value={aiContext}
            onChange={(e) => setAiContext(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Bijv. nieuw seizoensmenu, teamuitje, speciale actie..."
          />
        </div>
      </NestoModal>
    </div>
  );
}

// --- Extracted sub-components ---

function PlatformSelector({
  accountsWithStatus,
  selectedPlatforms,
  togglePlatform,
}: {
  accountsWithStatus: { platform: string; status: string }[];
  selectedPlatforms: SocialPlatform[];
  togglePlatform: (p: SocialPlatform) => void;
}) {
  return (
    <section className="space-y-3">
      <label className="text-sm font-medium">Platform</label>
      <div className="space-y-2">
        {PLATFORMS.map((platform) => {
          const account = accountsWithStatus.find((a) => a.platform === platform.id);
          const connected = account?.status === 'active' || account?.status === 'expiring';
          return (
            <Tooltip key={platform.id}>
              <TooltipTrigger asChild>
                <label
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border border-border/50 cursor-pointer transition-colors',
                    connected ? 'hover:bg-accent/30' : 'opacity-50 cursor-not-allowed',
                    selectedPlatforms.includes(platform.id) && 'border-primary/30 bg-primary/5'
                  )}
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => connected && togglePlatform(platform.id)}
                    disabled={!connected}
                  />
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platform.color }} />
                  <span className="text-sm font-medium">{platform.label}</span>
                </label>
              </TooltipTrigger>
              {!connected && <TooltipContent>Koppel eerst in Instellingen</TooltipContent>}
            </Tooltip>
          );
        })}
      </div>
    </section>
  );
}

function CaptionSection({
  caption,
  onCaptionChange,
  charLimit,
  overLimit,
  selectedPlatforms,
  perPlatformMode,
  setPerPlatformMode,
  platformCaptions,
  onPlatformCaptionChange,
  platformTabs,
  activePlatformTab,
  setActivePlatformTab,
  showAltCaption,
  setShowAltCaption,
  alternativeCaption,
  setAltCaption,
  onAIClick,
  aiDisabled,
  aiLoading,
}: {
  caption: string;
  onCaptionChange: (v: string) => void;
  charLimit: number | null;
  overLimit: boolean;
  selectedPlatforms: SocialPlatform[];
  perPlatformMode: boolean;
  setPerPlatformMode: (v: boolean) => void;
  platformCaptions: Partial<Record<SocialPlatform, string>>;
  onPlatformCaptionChange: (p: SocialPlatform, v: string) => void;
  platformTabs: { id: string; label: string }[];
  activePlatformTab: string;
  setActivePlatformTab: (v: string) => void;
  showAltCaption: boolean;
  setShowAltCaption: (v: boolean) => void;
  alternativeCaption: string;
  setAltCaption: (v: string) => void;
  onAIClick: () => void;
  aiDisabled: boolean;
  aiLoading: boolean;
}) {
  const activePlatform = activePlatformTab as SocialPlatform;
  const activePlatformCharLimit = PLATFORMS.find((p) => p.id === activePlatform)?.maxChars;
  const currentPlatformCaption = platformCaptions[activePlatform] ?? '';

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Bericht</label>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <NestoButton
                variant="outline"
                size="sm"
                onClick={onAIClick}
                disabled={aiDisabled || aiLoading}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                {aiLoading ? 'Genereren...' : 'AI schrijven'}
              </NestoButton>
            </span>
          </TooltipTrigger>
          {aiDisabled && <TooltipContent>Selecteer eerst een platform</TooltipContent>}
        </Tooltip>
      </div>

      {perPlatformMode && selectedPlatforms.length > 1 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <NestoTabs
              tabs={platformTabs}
              activeTab={activePlatformTab}
              onTabChange={setActivePlatformTab}
            />
            <button
              onClick={() => setPerPlatformMode(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Eén tekst voor alles
            </button>
          </div>
          <textarea
            value={currentPlatformCaption}
            onChange={(e) => onPlatformCaptionChange(activePlatform, e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Schrijf je bericht..."
          />
          {activePlatformCharLimit && (
            <div className={cn('text-xs text-right tabular-nums', currentPlatformCaption.length > activePlatformCharLimit ? 'text-destructive' : 'text-muted-foreground')}>
              {currentPlatformCaption.length} / {activePlatformCharLimit}
            </div>
          )}
        </div>
      ) : (
        <>
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Schrijf je bericht..."
          />
          {charLimit !== null && (
            <div className={cn('text-xs text-right tabular-nums', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
              {caption.length} / {charLimit}
            </div>
          )}
          {selectedPlatforms.length > 1 && Object.keys(platformCaptions).length > 0 && (
            <button
              onClick={() => {
                setPerPlatformMode(true);
                setActivePlatformTab(selectedPlatforms[0]);
              }}
              className="text-xs text-primary hover:underline"
            >
              Per platform bewerken
            </button>
          )}
        </>
      )}

      {/* Alt caption */}
      {!showAltCaption && (
        <button onClick={() => setShowAltCaption(true)} className="text-xs text-primary hover:underline">
          + Alternatieve caption
        </button>
      )}
      {showAltCaption && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Alternatieve caption (A/B)</label>
          <textarea
            value={alternativeCaption}
            onChange={(e) => setAltCaption(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Optioneel: alternatieve versie..."
          />
        </div>
      )}
    </section>
  );
}

function PublishSection({
  publishMode,
  setPublishMode,
  scheduleDate,
  setScheduleDate,
  hour,
  setHour,
  minute,
  setMinute,
  timingSuggestion,
}: {
  publishMode: PublishMode;
  setPublishMode: (m: PublishMode) => void;
  scheduleDate: string;
  setScheduleDate: (d: string) => void;
  hour: string;
  setHour: (h: string) => void;
  minute: string;
  setMinute: (m: string) => void;
  timingSuggestion: { time?: string; day?: string } | null;
}) {
  return (
    <section className="space-y-3">
      <label className="text-sm font-medium">Publiceren</label>
      <div className="flex gap-2">
        <button
          onClick={() => setPublishMode('now')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
            publishMode === 'now'
              ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
              : 'border-border text-muted-foreground hover:bg-accent/30'
          )}
        >
          Nu publiceren
        </button>
        <button
          onClick={() => setPublishMode('schedule')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
            publishMode === 'schedule'
              ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
              : 'border-border text-muted-foreground hover:bg-accent/30'
          )}
        >
          Inplannen
        </button>
      </div>

      {publishMode === 'schedule' && (
        <div className="flex gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Datum</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Uur</label>
            <NestoSelect value={hour} onValueChange={setHour} options={HOURS} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Minuut</label>
            <NestoSelect value={minute} onValueChange={setMinute} options={MINUTES} />
          </div>
        </div>
      )}

      {timingSuggestion && (
        <InfoAlert
          variant="info"
          title="AI suggestie"
          description={`Optimale publicatietijd: ${timingSuggestion.time ?? ''}${timingSuggestion.day ? ` op ${timingSuggestion.day}` : ''}`}
        />
      )}
    </section>
  );
}
