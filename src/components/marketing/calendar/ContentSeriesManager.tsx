import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoModal } from '@/components/polar/NestoModal';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar/EmptyState';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useContentSeries, useCreateSeries, useUpdateSeries, useDeleteSeries, type ContentSeries } from '@/hooks/useContentSeries';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Wekelijks' },
  { value: 'biweekly', label: 'Tweewekelijks' },
  { value: 'monthly', label: 'Maandelijks' },
];

const DAY_OPTIONS = [
  { value: 'monday', label: 'Maandag' },
  { value: 'tuesday', label: 'Dinsdag' },
  { value: 'wednesday', label: 'Woensdag' },
  { value: 'thursday', label: 'Donderdag' },
  { value: 'friday', label: 'Vrijdag' },
  { value: 'saturday', label: 'Zaterdag' },
  { value: 'sunday', label: 'Zondag' },
];

interface ContentSeriesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SeriesForm {
  name: string;
  description: string;
  frequency: string;
  preferred_day: string;
  content_type: string;
  template_prompt: string;
}

const emptyForm: SeriesForm = {
  name: '',
  description: '',
  frequency: 'weekly',
  preferred_day: '',
  content_type: '',
  template_prompt: '',
};

export function ContentSeriesManager({ open, onOpenChange }: ContentSeriesManagerProps) {
  const { data: series = [], isLoading } = useContentSeries();
  const createSeries = useCreateSeries();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();

  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SeriesForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setEditModal(true);
  }

  function openEdit(s: ContentSeries) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? '',
      frequency: s.frequency,
      preferred_day: s.preferred_day ?? '',
      content_type: s.content_type ?? '',
      template_prompt: s.template_prompt ?? '',
    });
    setEditModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    const payload = {
      name: form.name,
      description: form.description || undefined,
      frequency: form.frequency,
      preferred_day: form.preferred_day || undefined,
      content_type: form.content_type || undefined,
      template_prompt: form.template_prompt || undefined,
    };

    if (editingId) {
      updateSeries.mutate({ id: editingId, ...payload }, { onSuccess: () => setEditModal(false) });
    } else {
      createSeries.mutate(payload, { onSuccess: () => setEditModal(false) });
    }
  }

  function handleToggle(s: ContentSeries) {
    updateSeries.mutate({ id: s.id, is_active: !s.is_active });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>Content Series</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <NestoButton size="sm" onClick={openCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Nieuwe serie
            </NestoButton>

            {isLoading && <div className="text-sm text-muted-foreground">Laden...</div>}

            {!isLoading && series.length === 0 && (
              <EmptyState
                title="Geen series"
                description="Maak een serie aan voor terugkerende content rubrieken."
              />
            )}

            <div className="space-y-2">
              {series.map((s) => (
                <div
                  key={s.id}
                  onClick={() => openEdit(s)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <NestoBadge variant="default">
                        {FREQUENCY_OPTIONS.find((f) => f.value === s.frequency)?.label ?? s.frequency}
                      </NestoBadge>
                      {s.preferred_day && (
                        <span className="text-xs text-muted-foreground">
                          {DAY_OPTIONS.find((d) => d.value === s.preferred_day)?.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(e) => {
                      e; // prevent click propagation
                      handleToggle(s);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(s.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit/Create Modal */}
      <NestoModal
        open={editModal}
        onOpenChange={setEditModal}
        title={editingId ? 'Serie bewerken' : 'Nieuwe serie'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <NestoButton variant="outline" onClick={() => setEditModal(false)}>Annuleren</NestoButton>
            <NestoButton
              onClick={handleSave}
              disabled={!form.name.trim() || createSeries.isPending || updateSeries.isPending}
            >
              {createSeries.isPending || updateSeries.isPending ? 'Opslaan...' : 'Opslaan'}
            </NestoButton>
          </div>
        }
      >
        <div className="space-y-4">
          <NestoInput
            label="Naam"
            placeholder="Bijv. Chef's tip van de week"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <NestoInput
            label="Beschrijving"
            placeholder="Korte omschrijving van de serie"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <NestoSelect
              label="Frequentie"
              value={form.frequency}
              onValueChange={(v) => setForm({ ...form, frequency: v })}
              options={FREQUENCY_OPTIONS}
            />
            <NestoSelect
              label="Voorkeursdag"
              value={form.preferred_day}
              onValueChange={(v) => setForm({ ...form, preferred_day: v })}
              options={DAY_OPTIONS}
              placeholder="Geen voorkeur"
            />
          </div>
          <NestoInput
            label="Content type"
            placeholder="Bijv. behind_the_scenes, food_photography"
            value={form.content_type}
            onChange={(e) => setForm({ ...form, content_type: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-foreground">Template prompt</label>
            <textarea
              value={form.template_prompt}
              onChange={(e) => setForm({ ...form, template_prompt: e.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Instructie voor AI bij het genereren van content voor deze serie..."
            />
          </div>
        </div>
      </NestoModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Serie verwijderen?"
        description="Deze serie wordt permanent verwijderd."
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={() => {
          if (deleteId) deleteSeries.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
        isLoading={deleteSeries.isPending}
      />
    </>
  );
}
