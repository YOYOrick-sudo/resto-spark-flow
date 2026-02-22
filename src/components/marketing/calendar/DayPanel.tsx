import { useState } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { NestoPanel } from '@/components/polar/NestoPanel';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { getHolidayForDate } from '@/lib/dutchHolidays';
import { QuickCreatePost } from './QuickCreatePost';
import { useDeleteSocialPost } from '@/hooks/useMarketingSocialPosts';
import { nestoToast } from '@/lib/nestoToast';
import { cn } from '@/lib/utils';
import type { SocialPost } from '@/hooks/useMarketingSocialPosts';

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_business: 'Google Business',
};

import { PLATFORM_COLORS } from '@/lib/platformColors';

const STATUS_MAP: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  scheduled: 'warning',
  published: 'success',
  failed: 'error',
};

interface DayPanelProps {
  date: Date | null;
  posts: SocialPost[];
  onClose: () => void;
}

export function DayPanel({ date, posts, onClose }: DayPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const deletePost = useDeleteSocialPost();

  if (!date) return null;

  const holiday = getHolidayForDate(date);
  const title = format(date, 'EEEE d MMMM', { locale: nl });

  function handleDelete(id: string) {
    deletePost.mutate(id, {
      onSuccess: () => nestoToast.success('Bericht verwijderd'),
      onError: () => nestoToast.error('Verwijderen mislukt'),
    });
  }

  return (
    <NestoPanel open title={title} onClose={onClose}>
      {(titleRef) => (
        <div className="px-5 py-6">
          <h2 ref={titleRef} className="text-lg font-semibold capitalize mb-1">
            {title}
          </h2>

          {holiday && (
            <NestoBadge variant="default" className="mb-4">{holiday}</NestoBadge>
          )}

          {/* Posts list */}
          <div className="space-y-3 mt-4">
            {posts.length === 0 && !showCreate && (
              <p className="text-sm text-muted-foreground">Geen berichten voor deze dag.</p>
            )}

            {posts.map((post) => {
              const expanded = expandedId === post.id;
              return (
                <div
                  key={post.id}
                  className="border border-border/50 rounded-xl p-3 hover:border-border transition-colors"
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : post.id)}
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: PLATFORM_COLORS[post.platform] }}
                    />
                    <span className="text-sm font-medium flex-1 truncate">
                      {PLATFORM_LABELS[post.platform] ?? post.platform}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {post.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : '--:--'}
                    </span>
                    <NestoBadge variant={STATUS_MAP[post.status] ?? 'default'}>
                      {post.status}
                    </NestoBadge>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {post.content_text || 'Geen tekst'}
                      </p>
                      {post.hashtags.length > 0 && (
                        <p className="text-xs text-primary mt-2">
                          {post.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
                        </p>
                      )}
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                          className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Verwijderen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider + Create */}
          <div className="border-t border-border/50 pt-4 mt-4">
            {showCreate ? (
              <QuickCreatePost
                date={date}
                onCancel={() => setShowCreate(false)}
                onCreated={() => setShowCreate(false)}
              />
            ) : (
              <NestoButton variant="outline" onClick={() => setShowCreate(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Nieuw bericht
              </NestoButton>
            )}
          </div>
        </div>
      )}
    </NestoPanel>
  );
}
