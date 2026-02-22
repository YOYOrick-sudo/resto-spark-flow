import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { RefreshCw, Share2, Bookmark } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { EmptyState } from '@/components/polar/EmptyState';
import { useTaggedPosts } from '@/hooks/useUGC';
import { useMarketingSocialAccounts } from '@/hooks/useMarketingSocialAccounts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function UGCGrid() {
  const navigate = useNavigate();
  const { data: posts = [], isLoading, refetch } = useTaggedPosts();
  const { accountsWithStatus } = useMarketingSocialAccounts();
  const hasInstagram = accountsWithStatus.some((a) => a.platform === 'instagram' && a.status !== 'disconnected');

  if (!hasInstagram) {
    return (
      <EmptyState
        title="Instagram niet gekoppeld"
        description="Koppel Instagram in de marketing instellingen om tagged content te zien."
        action={{ label: 'Naar instellingen', onClick: () => navigate('/marketing/instellingen') }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Geen tagged content gevonden"
        description="Als gasten je restaurant taggen op Instagram, verschijnen ze hier."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{posts.length} tagged posts</p>
        <NestoButton variant="ghost" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Vernieuwen
        </NestoButton>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map((post) => (
          <div key={post.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
            <div className="aspect-square">
              {post.media_url ? (
                <img src={post.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                  Geen afbeelding
                </div>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
              <NestoButton
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => {
                  const credit = `@${post.username}`;
                  const caption = post.caption ? `${post.caption}\n\n📸 ${credit}` : `📸 ${credit}`;
                  navigate('/marketing/social/nieuw', {
                    state: { prefill: { content_text: caption, media_urls: post.media_url ? [post.media_url] : [] } },
                  });
                }}
                leftIcon={<Share2 className="h-3.5 w-3.5" />}
              >
                Repost
              </NestoButton>

              <Tooltip>
                <TooltipTrigger asChild>
                  <NestoButton
                    size="sm"
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 opacity-50 cursor-not-allowed"
                    disabled
                    leftIcon={<Bookmark className="h-3.5 w-3.5" />}
                  >
                    Opslaan
                  </NestoButton>
                </TooltipTrigger>
                <TooltipContent>Binnenkort — media bibliotheek</TooltipContent>
              </Tooltip>
            </div>

            {/* Footer info */}
            <div className="p-2.5">
              <p className="text-xs font-medium text-foreground truncate">@{post.username}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(post.timestamp), 'd MMM yyyy', { locale: nl })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
