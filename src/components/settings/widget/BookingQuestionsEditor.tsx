import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoSelect } from '@/components/polar/NestoSelect';
import type { BookingQuestion } from '@/hooks/useWidgetSettings';

interface BookingQuestionsEditorProps {
  questions: BookingQuestion[];
  onChange: (questions: BookingQuestion[]) => void;
}

export function BookingQuestionsEditor({ questions, onChange }: BookingQuestionsEditorProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<BookingQuestion>>({
    label: '',
    type: 'text',
    target: 'reservation_tags',
    options: [],
  });
  const [optionInput, setOptionInput] = useState('');

  const addQuestion = () => {
    if (!draft.label?.trim()) return;
    const newQ: BookingQuestion = {
      id: crypto.randomUUID(),
      label: draft.label!.trim(),
      type: draft.type as BookingQuestion['type'],
      target: draft.target as BookingQuestion['target'],
      options: draft.type !== 'text' ? (draft.options || []) : undefined,
    };
    onChange([...questions, newQ]);
    setAdding(false);
    setDraft({ label: '', type: 'text', target: 'reservation_tags', options: [] });
    setOptionInput('');
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setDraft(prev => ({ ...prev, options: [...(prev.options || []), optionInput.trim()] }));
    setOptionInput('');
  };

  const removeOption = (idx: number) => {
    setDraft(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== idx),
    }));
  };

  const typeOptions = [
    { value: 'text', label: 'Tekstveld' },
    { value: 'single_select', label: 'Enkele keuze' },
    { value: 'multi_select', label: 'Meerdere keuzes' },
  ];

  const targetOptions = [
    { value: 'reservation_tags', label: 'Reservering tags' },
    { value: 'customer_tags', label: 'Klant tags' },
  ];

  return (
    <div className="space-y-3">
      {questions.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">Nog geen vragen geconfigureerd.</p>
      )}

      {questions.map(q => (
        <div key={q.id} className="flex items-start justify-between gap-3 bg-background rounded-button border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{q.label}</p>
            <p className="text-xs text-muted-foreground">
              {q.type === 'text' ? 'Tekstveld' : q.type === 'single_select' ? 'Enkele keuze' : 'Meerdere keuzes'}
              {' · '}
              {q.target === 'customer_tags' ? 'Klant tags' : 'Reservering tags'}
              {q.options?.length ? ` · ${q.options.length} opties` : ''}
            </p>
          </div>
          <button onClick={() => removeQuestion(q.id)} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="bg-background rounded-card border border-border p-4 space-y-3">
          <div>
            <Label className="text-sm mb-1.5">Vraag label</Label>
            <Input
              value={draft.label || ''}
              onChange={e => setDraft(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Bijv. Heeft u dieetwensen?"
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1.5">Type</Label>
              <NestoSelect
                value={draft.type || 'text'}
                onValueChange={v => setDraft(prev => ({ ...prev, type: v as BookingQuestion['type'], options: v === 'text' ? [] : prev.options }))}
                options={typeOptions}
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5">Opslaan als</Label>
              <NestoSelect
                value={draft.target || 'reservation_tags'}
                onValueChange={v => setDraft(prev => ({ ...prev, target: v as BookingQuestion['target'] }))}
                options={targetOptions}
              />
            </div>
          </div>

          {draft.type !== 'text' && (
            <div>
              <Label className="text-sm mb-1.5">Opties</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Nieuwe optie"
                  className="text-sm"
                />
                <NestoButton size="sm" variant="secondary" onClick={addOption}>Toevoegen</NestoButton>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(draft.options || []).map((opt, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-sm px-2 py-0.5 rounded-full">
                    {opt}
                    <button onClick={() => removeOption(idx)} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <NestoButton size="sm" onClick={addQuestion} disabled={!draft.label?.trim()}>Toevoegen</NestoButton>
            <NestoButton size="sm" variant="secondary" onClick={() => setAdding(false)}>Annuleren</NestoButton>
          </div>
        </div>
      ) : (
        <NestoButton size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Vraag toevoegen
        </NestoButton>
      )}
    </div>
  );
}
