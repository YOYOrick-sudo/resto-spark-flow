import { NestoInput } from '@/components/polar/NestoInput';
import { Textarea } from '@/components/ui/textarea';
import type { ApplicationSettings } from '@/hooks/useApplicationSettings';

interface Props {
  draft: ApplicationSettings;
  setDraft: (s: ApplicationSettings) => void;
}

export function WelcomeContentSection({ draft, setDraft }: Props) {
  return (
    <section>
      <h2 className="text-base font-medium mb-1">Welkomsttekst</h2>
      <p className="text-sm text-muted-foreground mb-4">Wat ziet de kandidaat bovenaan de pagina?</p>
      <div className="space-y-4">
        <NestoInput
          label="Titel"
          value={draft.welcome_title}
          onChange={(e) => setDraft({ ...draft, welcome_title: e.target.value })}
          placeholder="Kom bij ons team werken"
          maxLength={80}
        />
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Inleidende tekst</label>
          <Textarea
            value={draft.welcome_text ?? ''}
            onChange={(e) => setDraft({ ...draft, welcome_text: e.target.value || null })}
            placeholder="Vertel kort wie je bent en waarom kandidaten bij jou willen werken…"
            rows={4}
            maxLength={500}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{(draft.welcome_text ?? '').length}/500</p>
        </div>
      </div>
    </section>
  );
}