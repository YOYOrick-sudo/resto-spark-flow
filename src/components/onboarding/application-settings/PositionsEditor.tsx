import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { NestoInput } from '@/components/polar/NestoInput';
import { NestoButton } from '@/components/polar/NestoButton';
import type { ApplicationSettings } from '@/hooks/useApplicationSettings';

interface Props {
  draft: ApplicationSettings;
  setDraft: (s: ApplicationSettings) => void;
}

export function PositionsEditor({ draft, setDraft }: Props) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (draft.available_positions.includes(v)) {
      setInput('');
      return;
    }
    setDraft({ ...draft, available_positions: [...draft.available_positions, v] });
    setInput('');
  };

  const remove = (p: string) =>
    setDraft({ ...draft, available_positions: draft.available_positions.filter((x) => x !== p) });

  return (
    <section>
      <h2 className="text-base font-medium mb-1">Beschikbare functies</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Welke functies kunnen kandidaten kiezen? Minimaal 1 vereist.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {draft.available_positions.map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5 bg-secondary text-sm px-3 py-1.5 rounded-full">
            {p}
            <button onClick={() => remove(p)} className="text-muted-foreground hover:text-destructive" aria-label={`Verwijder ${p}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {draft.available_positions.length === 0 && (
          <p className="text-xs text-destructive">Voeg minstens één functie toe.</p>
        )}
      </div>

      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <NestoInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Bijv. Bediening"
            maxLength={40}
          />
        </div>
        <NestoButton variant="secondary" onClick={add} disabled={!input.trim()}>
          <Plus className="h-4 w-4" /> Toevoegen
        </NestoButton>
      </div>
    </section>
  );
}