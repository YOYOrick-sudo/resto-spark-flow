import { useState, useMemo } from 'react';
import { format, setHours, setMinutes } from 'date-fns';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreateSocialPost } from '@/hooks/useMarketingSocialPosts';
import { useMarketingSocialAccounts, type SocialPlatform } from '@/hooks/useMarketingSocialAccounts';
import { useSocialMediaUpload } from '@/hooks/useSocialMediaUpload';
import { MediaUploadZone } from '@/components/marketing/social/MediaUploadZone';
import { nestoToast } from '@/lib/nestoToast';
import { cn } from '@/lib/utils';

import { PLATFORM_COLORS } from '@/lib/platformColors';

const PLATFORMS: { id: SocialPlatform; label: string; color: string; maxChars: number }[] = [
  { id: 'instagram', label: 'Instagram', color: PLATFORM_COLORS.instagram, maxChars: 2200 },
  { id: 'facebook', label: 'Facebook', color: PLATFORM_COLORS.facebook, maxChars: 63206 },
  { id: 'google_business', label: 'Google Business', color: PLATFORM_COLORS.google_business, maxChars: 1500 },
];

const CONTENT_TYPES = [
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

interface QuickCreatePostProps {
  date: Date;
  onCancel: () => void;
  onCreated: () => void;
}

export function QuickCreatePost({ date, onCancel, onCreated }: QuickCreatePostProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [contentType, setContentType] = useState('');

  const createPost = useCreateSocialPost();
  const { accountsWithStatus } = useMarketingSocialAccounts();
  const { mediaUrls, uploading, uploadFiles, removeMedia } = useSocialMediaUpload();

  const charLimit = useMemo(() => {
    if (selectedPlatforms.length === 0) return null;
    const limits = selectedPlatforms.map((p) => PLATFORMS.find((pl) => pl.id === p)?.maxChars ?? Infinity);
    return Math.min(...limits);
  }, [selectedPlatforms]);

  const overLimit = charLimit !== null && caption.length > charLimit;

  function togglePlatform(platform: SocialPlatform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  async function handleSubmit() {
    if (selectedPlatforms.length === 0) {
      nestoToast.error('Selecteer minstens één platform');
      return;
    }
    if (!caption.trim()) {
      nestoToast.error('Voer een bericht in');
      return;
    }

    const scheduledAt = setMinutes(setHours(date, parseInt(hour)), parseInt(minute));
    const hashtagList = hashtags
      .split(/[,\s]+/)
      .map((h) => h.replace(/^#/, '').trim())
      .filter(Boolean);

    try {
      // Create one post per platform
      for (const platform of selectedPlatforms) {
        await createPost.mutateAsync({
          platform,
          content_text: caption,
          hashtags: hashtagList,
          scheduled_at: scheduledAt.toISOString(),
          content_type_tag: contentType || undefined,
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        });
      }
      nestoToast.success(`Bericht ingepland voor ${hour}:${minute}`);
      onCreated();
    } catch {
      nestoToast.error('Inplannen mislukt');
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Nieuw bericht</h3>

      {/* Platform selection */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Platform</label>
        <div className="space-y-1.5">
          {PLATFORMS.map((platform) => {
            const account = accountsWithStatus.find((a) => a.platform === platform.id);
            const connected = account?.status === 'active' || account?.status === 'expiring';

            return (
              <Tooltip key={platform.id}>
                <TooltipTrigger asChild>
                  <label
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border border-border/50 cursor-pointer transition-colors',
                      connected ? 'hover:bg-accent/30' : 'opacity-50 cursor-not-allowed',
                      selectedPlatforms.includes(platform.id) && 'border-primary/30 bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selectedPlatforms.includes(platform.id)}
                      onCheckedChange={() => connected && togglePlatform(platform.id)}
                      disabled={!connected}
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-sm">{platform.label}</span>
                  </label>
                </TooltipTrigger>
                {!connected && (
                  <TooltipContent>Koppel eerst in Instellingen</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Bericht</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Schrijf je bericht..."
        />
        {charLimit !== null && (
          <div className={cn('text-xs text-right tabular-nums', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
            {caption.length} / {charLimit}
          </div>
        )}
      </div>

      {/* Hashtags */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Hashtags</label>
        <input
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="#restaurant #food #chef"
        />
      </div>

      {/* Time picker */}
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Uur</label>
          <NestoSelect value={hour} onValueChange={setHour} options={HOURS} />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Minuut</label>
          <NestoSelect value={minute} onValueChange={setMinute} options={MINUTES} />
        </div>
      </div>

      {/* Content type */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Content type</label>
        <NestoSelect
          value={contentType}
          onValueChange={setContentType}
          options={CONTENT_TYPES}
          placeholder="Selecteer type..."
        />
      </div>

      {/* Media placeholder */}
      <MediaUploadZone
        mediaUrls={mediaUrls}
        uploading={uploading}
        onUpload={uploadFiles}
        onRemove={removeMedia}
        compact
      />

      {/* Actions */}
      <div className="flex gap-2">
        <NestoButton variant="outline" onClick={onCancel} className="flex-1">
          Annuleren
        </NestoButton>
        <NestoButton
          onClick={handleSubmit}
          disabled={createPost.isPending || overLimit}
          className="flex-1"
        >
          {createPost.isPending ? 'Bezig...' : 'Inplannen'}
        </NestoButton>
      </div>
    </div>
  );
}
