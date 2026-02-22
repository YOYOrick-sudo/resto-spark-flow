import type { SocialPlatform } from '@/hooks/useMarketingSocialAccounts';
import { cn } from '@/lib/utils';

interface SocialPreviewPanelProps {
  platforms: SocialPlatform[];
  caption: string;
  hashtags: string[];
  platformCaptions?: Partial<Record<SocialPlatform, string>>;
}

const PLATFORM_META: Record<SocialPlatform, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  google_business: { label: 'Google Business', color: '#34A853' },
};

function InstagramPreview({ caption, hashtags }: { caption: string; hashtags: string[] }) {
  const hashtagText = hashtags.length > 0 ? '\n\n' + hashtags.map((h) => `#${h}`).join(' ') : '';
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#E1306C] to-[#FCAF45]" />
        <span className="text-xs font-semibold">jouw_restaurant</span>
      </div>
      <div className="aspect-square bg-muted/30 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Afbeelding</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        <div className="flex gap-3 text-muted-foreground">
          <span className="text-sm">♡</span>
          <span className="text-sm">💬</span>
          <span className="text-sm">↗</span>
        </div>
        <p className="text-xs leading-relaxed line-clamp-4">
          <span className="font-semibold">jouw_restaurant</span>{' '}
          {caption || 'Je bericht verschijnt hier...'}{hashtagText}
        </p>
      </div>
    </div>
  );
}

function FacebookPreview({ caption }: { caption: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-[#1877F2]" />
        <div>
          <p className="text-xs font-semibold">Jouw Restaurant</p>
          <p className="text-[10px] text-muted-foreground">Zojuist · 🌐</p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-xs leading-relaxed line-clamp-4">
          {caption || 'Je bericht verschijnt hier...'}
        </p>
      </div>
      <div className="border-t border-border/50 px-3 py-2 flex justify-around text-[10px] text-muted-foreground font-medium">
        <span>👍 Vind ik leuk</span>
        <span>💬 Reageren</span>
        <span>↗ Delen</span>
      </div>
    </div>
  );
}

function GooglePreview({ caption }: { caption: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-[#34A853] flex items-center justify-center text-white text-xs font-bold">G</div>
        <div>
          <p className="text-xs font-semibold">Jouw Restaurant</p>
          <p className="text-[10px] text-muted-foreground">Google Bedrijfsprofiel</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <p className="text-xs leading-relaxed line-clamp-4">
          {caption || 'Je bericht verschijnt hier...'}
        </p>
      </div>
    </div>
  );
}

export function SocialPreviewPanel({ platforms, caption, hashtags, platformCaptions }: SocialPreviewPanelProps) {
  if (platforms.length === 0) {
    return (
      <div className="sticky top-6 bg-secondary border border-border rounded-xl p-6">
        <p className="text-sm text-muted-foreground text-center">Selecteer een platform om de preview te zien</p>
      </div>
    );
  }

  const getCaption = (platform: SocialPlatform) => platformCaptions?.[platform] || caption;

  return (
    <div className="sticky top-6 space-y-4">
      <h3 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Live preview</h3>
      {platforms.includes('instagram') && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: PLATFORM_META.instagram.color }}>Instagram</p>
          <InstagramPreview caption={getCaption('instagram')} hashtags={hashtags} />
        </div>
      )}
      {platforms.includes('facebook') && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: PLATFORM_META.facebook.color }}>Facebook</p>
          <FacebookPreview caption={getCaption('facebook')} />
        </div>
      )}
      {platforms.includes('google_business') && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: PLATFORM_META.google_business.color }}>Google Business</p>
          <GooglePreview caption={getCaption('google_business')} />
        </div>
      )}
    </div>
  );
}
