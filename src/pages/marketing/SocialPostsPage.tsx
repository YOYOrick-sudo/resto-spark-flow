import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoTabs } from '@/components/polar/NestoTabs';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar/EmptyState';
import { useAllSocialPosts } from '@/hooks/useAllSocialPosts';
import { useDeleteSocialPost } from '@/hooks/useMarketingSocialPosts';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { nestoToast } from '@/lib/nestoToast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  google_business: '#34A853',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_business: 'Google Business',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  draft: { label: 'Concept', variant: 'default' },
  scheduled: { label: 'Ingepland', variant: 'warning' },
  published: { label: 'Gepubliceerd', variant: 'success' },
  failed: { label: 'Mislukt', variant: 'error' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle statussen' },
  { value: 'draft', label: 'Concept' },
  { value: 'scheduled', label: 'Ingepland' },
  { value: 'published', label: 'Gepubliceerd' },
  { value: 'failed', label: 'Mislukt' },
];

const TABS = [
  { id: 'all', label: 'Alles' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'google_business', label: 'Google' },
];

export default function SocialPostsPage() {
  const navigate = useNavigate();
  const [platformTab, setPlatformTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = {
    platform: platformTab === 'all' ? undefined : platformTab,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { data: posts = [], isLoading } = useAllSocialPosts(filters);
  const deletePost = useDeleteSocialPost();

  function handleDelete() {
    if (!deleteId) return;
    deletePost.mutate(deleteId, {
      onSuccess: () => {
        nestoToast.success('Bericht verwijderd');
        setDeleteId(null);
      },
      onError: () => nestoToast.error('Verwijderen mislukt'),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social"
        actions={
          <NestoButton onClick={() => navigate('/marketing/social/nieuw')}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuw bericht
          </NestoButton>
        }
      />

      <NestoTabs
        tabs={TABS}
        activeTab={platformTab}
        onTabChange={setPlatformTab}
      />

      <div className="flex items-center gap-3">
        <div className="w-48">
          <NestoSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Alle statussen"
          />
        </div>
      </div>

      {posts.length === 0 && !isLoading ? (
        <EmptyState
          title="Nog geen social posts"
          description="Maak je eerste bericht aan om te starten."
          action={{ label: 'Nieuw bericht', onClick: () => navigate('/marketing/social/nieuw') }}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Platform</TableHead>
                <TableHead>Bericht</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[160px]">Gepland</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const status = STATUS_MAP[post.status] ?? STATUS_MAP.draft;
                return (
                  <TableRow key={post.id} className="cursor-pointer hover:bg-accent/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PLATFORM_COLORS[post.platform] ?? '#888' }}
                        />
                        <span className="text-sm">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate block max-w-[300px]">
                        {post.content_text || '(geen tekst)'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <NestoBadge variant={status.variant}>{status.label}</NestoBadge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {post.scheduled_at
                          ? format(new Date(post.scheduled_at), 'd MMM HH:mm', { locale: nl })
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(post.id);
                        }}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Bericht verwijderen?"
        description="Dit bericht wordt permanent verwijderd."
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deletePost.isPending}
      />
    </div>
  );
}
