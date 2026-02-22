import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar/EmptyState';
import { useMarketingCampaigns, useDeleteCampaign } from '@/hooks/useMarketingCampaigns';
import { usePermission } from '@/hooks/usePermission';
import { Plus, Mail, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { nestoToast } from '@/lib/nestoToast';
import { useState } from 'react';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'primary' | 'success' | 'pending' | 'warning' | 'error' }> = {
  draft: { label: 'Concept', variant: 'default' },
  scheduled: { label: 'Ingepland', variant: 'pending' },
  sending: { label: 'Verzenden...', variant: 'primary' },
  sent: { label: 'Verzonden', variant: 'success' },
  paused: { label: 'Gepauzeerd', variant: 'warning' },
  failed: { label: 'Mislukt', variant: 'error' },
};

export default function CampaignesPage() {
  const navigate = useNavigate();
  const canManage = usePermission('marketing.manage');
  const { data: campaigns = [], isLoading } = useMarketingCampaigns();
  const deleteMutation = useDeleteCampaign();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        nestoToast.success('Campagne verwijderd');
        setDeleteId(null);
      },
      onError: () => nestoToast.error('Verwijderen mislukt'),
    });
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="Geen toegang" description="Je hebt geen rechten om campagnes te beheren." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Campagnes"
        subtitle="E-mail campagnes aanmaken en versturen"
        actions={[
          {
            label: 'Nieuwe campagne',
            onClick: () => navigate('/marketing/campagnes/nieuw'),
            icon: Plus,
          },
        ]}
      />

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-card" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nog geen campagnes"
          description="Maak je eerste e-mail campagne aan om gasten te bereiken."
          action={{
            label: 'Nieuwe campagne',
            onClick: () => navigate('/marketing/campagnes/nieuw'),
            icon: Plus,
          }}
        />
      ) : (
        <div className="border border-border/50 rounded-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2 pt-3">Naam</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2 pt-3">Status</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2 pt-3">Verzonden</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2 pt-3">Gepland</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pb-2 pt-3">Aangemaakt</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {campaigns.map((c) => {
                const status = STATUS_MAP[c.status] ?? STATUS_MAP.draft;
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
                    onClick={() => navigate(`/marketing/campagnes/nieuw?id=${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground text-sm">{c.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <NestoBadge variant={status.variant} dot size="sm">{status.label}</NestoBadge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                      {c.sent_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {c.scheduled_at ? format(new Date(c.scheduled_at), 'd MMM yyyy HH:mm', { locale: nl }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: nl })}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === 'draft' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Campagne verwijderen"
        description="Weet je zeker dat je dit concept wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
