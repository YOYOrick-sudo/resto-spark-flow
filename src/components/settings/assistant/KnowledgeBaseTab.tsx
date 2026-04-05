import { useState } from 'react';
import { Plus, Search, BookOpen, Eye, EyeOff } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoModal } from '@/components/polar/NestoModal';
import { EmptyState } from '@/components/polar/EmptyState';
import { CardSkeleton } from '@/components/polar/LoadingStates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useKnowledgeBase, type KnowledgeBaseEntry, type KnowledgeBaseInput } from '@/hooks/useKnowledgeBase';

const CATEGORIES = [
  { value: 'algemeen', label: 'Algemeen' },
  { value: 'reserveringen', label: 'Reserveringen' },
  { value: 'eten', label: 'Eten & Drinken' },
  { value: 'faciliteiten', label: 'Faciliteiten' },
  { value: 'custom', label: 'Overig' },
];

export function KnowledgeBaseTab() {
  const { entries, isLoading, createEntry, updateEntry, deleteEntry } = useKnowledgeBase();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<KnowledgeBaseEntry | null>(null);

  const [form, setForm] = useState<KnowledgeBaseInput & { is_active: boolean }>({
    category: 'algemeen',
    question: '',
    answer: '',
    is_active: true,
  });

  const filtered = entries.filter((e) => {
    if (!showInactive && !e.is_active) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.question?.toLowerCase().includes(q) ||
        e.answer.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCreate = () => {
    setEditEntry(null);
    setForm({ category: 'algemeen', question: '', answer: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (entry: KnowledgeBaseEntry) => {
    setEditEntry(entry);
    setForm({
      category: entry.category,
      question: entry.question || '',
      answer: entry.answer,
      is_active: entry.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.answer.trim()) return;
    if (editEntry) {
      updateEntry.mutate({ id: editEntry.id, ...form }, {
        onSuccess: () => setModalOpen(false),
      });
    } else {
      createEntry.mutate(form, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleDeactivate = (id: string) => {
    deleteEntry.mutate(id);
  };

  if (isLoading) return <CardSkeleton lines={6} />;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek in vragen of antwoorden..."
            className="pl-9 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] text-sm">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showInactive ? 'Verberg inactief' : 'Toon inactief'}
          </button>
          <NestoButton size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Toevoegen
          </NestoButton>
        </div>
      </div>

      {/* Entry list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Geen entries gevonden"
          description={entries.length === 0
            ? "Voeg FAQ-vragen toe zodat de AI-assistent antwoorden kan geven aan gasten."
            : "Pas je filters aan om entries te vinden."}
          size="md"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <NestoCard
              key={entry.id}
              className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => openEdit(entry)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <NestoBadge variant="default" size="sm">
                      {CATEGORIES.find((c) => c.value === entry.category)?.label || entry.category}
                    </NestoBadge>
                    {!entry.is_active && (
                      <NestoBadge variant="outline" size="sm">Inactief</NestoBadge>
                    )}
                    {entry.source !== 'manual' && (
                      <NestoBadge variant="primary" size="sm">{entry.source}</NestoBadge>
                    )}
                  </div>
                  {entry.question && (
                    <p className="text-sm font-medium text-foreground mb-0.5">{entry.question}</p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">{entry.answer}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                  <span>{entry.hit_count} hits</span>
                </div>
              </div>
            </NestoCard>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <NestoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editEntry ? 'Entry bewerken' : 'Nieuwe entry'}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {editEntry && (
              <NestoButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleDeactivate(editEntry.id);
                  setModalOpen(false);
                }}
                className="text-destructive hover:text-destructive"
              >
                Deactiveren
              </NestoButton>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <NestoButton variant="outline" onClick={() => setModalOpen(false)}>
                Annuleren
              </NestoButton>
              <NestoButton
                onClick={handleSave}
                disabled={!form.answer.trim() || createEntry.isPending || updateEntry.isPending}
              >
                {editEntry ? 'Opslaan' : 'Toevoegen'}
              </NestoButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5">Categorie</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm mb-1.5">Vraag (optioneel)</Label>
            <Input
              value={form.question || ''}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Bijv. Hebben jullie een terras?"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Laat leeg als het een statement is.</p>
          </div>

          <div>
            <Label className="text-sm mb-1.5">Antwoord</Label>
            <Textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Het antwoord dat de AI-assistent geeft aan gasten."
              className="text-sm min-h-[100px]"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Actief</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>
        </div>
      </NestoModal>
    </>
  );
}
