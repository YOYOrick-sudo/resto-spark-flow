import { useState } from 'react';
import { Users, Trash2, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { EmptyState } from '@/components/polar/EmptyState';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { SegmentBuilderModal } from '@/components/marketing/segments/SegmentBuilderModal';
import { useMarketingSegments, useCreateSegment, useUpdateSegment, useDeleteSegment, type MarketingSegment } from '@/hooks/useMarketingSegments';
import { nestoToast } from '@/lib/nestoToast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function SegmentsPage() {
  const { data: segments = [], isLoading } = useMarketingSegments();
  const createMutation = useCreateSegment();
  const updateMutation = useUpdateSegment();
  const deleteMutation = useDeleteSegment();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editSegment, setEditSegment] = useState<MarketingSegment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openCreate = () => {
    setEditSegment(null);
    setBuilderOpen(true);
  };

  const openEdit = (seg: MarketingSegment) => {
    setEditSegment(seg);
    setBuilderOpen(true);
  };

  const handleSave = async (data: { name: string; description?: string; filter_rules: any }) => {
    try {
      if (editSegment) {
        await updateMutation.mutateAsync({ id: editSegment.id, ...data });
        nestoToast.success('Segment bijgewerkt');
      } else {
        await createMutation.mutateAsync(data);
        nestoToast.success('Segment aangemaakt');
      }
      setBuilderOpen(false);
    } catch {
      nestoToast.error('Er ging iets mis');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      nestoToast.success('Segment verwijderd');
    } catch {
      nestoToast.error('Verwijderen mislukt');
    }
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Segmenten"
        subtitle="Groepeer gasten op basis van gedrag en kenmerken"
        actions={
          <NestoButton onClick={openCreate}>Nieuw segment</NestoButton>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-card bg-accent animate-pulse" />
          ))}
        </div>
      ) : segments.length === 0 ? (
        <EmptyState
          title="Nog geen segmenten"
          description="Maak je eerste segment om gasten te groeperen."
          action={{ label: 'Nieuw segment', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map(seg => (
            <NestoCard
              key={seg.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => openEdit(seg)}
            >
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body font-medium">{seg.name}</h3>
                    {seg.is_system && <NestoBadge variant="default">Systeem</NestoBadge>}
                  </div>
                  {!seg.is_system && (
                    <NestoButton
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(seg.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </NestoButton>
                  )}
                </div>
                {seg.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{seg.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <NestoBadge variant="primary">{seg.guest_count ?? 0}</NestoBadge>
                  </div>
                  {seg.last_campaign_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(seg.last_campaign_at), 'd MMM yyyy', { locale: nl })}</span>
                    </div>
                  )}
                </div>
              </div>
            </NestoCard>
          ))}
        </div>
      )}

      <SegmentBuilderModal
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        segment={editSegment}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Segment verwijderen"
        description="Weet je zeker dat je dit segment wilt verwijderen? Dit kan niet ongedaan worden."
        onConfirm={handleDelete}
        confirmLabel="Verwijderen"
        variant="destructive"
      />
    </div>
  );
}
