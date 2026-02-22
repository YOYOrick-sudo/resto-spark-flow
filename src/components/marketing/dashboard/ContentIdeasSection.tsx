import { useNavigate } from 'react-router-dom';
import { Lightbulb, Sparkles, Leaf, ArrowRight } from 'lucide-react';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { EmptyState } from '@/components/polar/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useContentIdeas } from '@/hooks/useContentIdeas';

const SOURCE_BADGE: Record<string, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' }> = {
  ai: { label: 'AI', variant: 'primary' },
  menu: { label: 'Menukaart', variant: 'success' },
  seasonal: { label: 'Seizoen', variant: 'warning' },
  weather: { label: 'Weer', variant: 'warning' },
  cross_module: { label: 'Cross-module', variant: 'default' },
  manual: { label: 'Handmatig', variant: 'default' },
};

interface ContentIdeasSectionProps {
  bestContentType?: string | null;
}

export function ContentIdeasSection({ bestContentType }: ContentIdeasSectionProps) {
  const navigate = useNavigate();
  const { data: ideas, isLoading } = useContentIdeas(5);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Content ideeën</h2>
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );
  }

  if (!ideas || ideas.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Content ideeën</h2>
        <EmptyState
          title="Nog geen ideeën"
          description="Ideeën verschijnen automatisch na je eerste posts en menu-updates."
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Content ideeën
        </h2>
      </div>
      <div className="space-y-2">
        {ideas.map((idea) => {
          const sourceBadge = SOURCE_BADGE[idea.source] ?? SOURCE_BADGE.manual;
          const isBestType = bestContentType && idea.idea_type === bestContentType;

          return (
            <div
              key={idea.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{idea.title}</span>
                  <NestoBadge variant={sourceBadge.variant} size="sm">{sourceBadge.label}</NestoBadge>
                </div>
                {idea.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{idea.description}</p>
                )}
                {isBestType && (
                  <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Dit type scoort het best bij jou
                  </p>
                )}
              </div>
              <NestoButton
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  navigate(`/marketing/social/nieuw?idea=${idea.id}&content_type=${idea.idea_type}`)
                }
              >
                Maak post
                <ArrowRight className="h-3 w-3 ml-1" />
              </NestoButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
