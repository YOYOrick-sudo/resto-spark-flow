import { Textarea } from '@/components/ui/textarea';
import type { ApplicationSettings } from '@/hooks/useApplicationSettings';

interface Props {
  draft: ApplicationSettings;
  setDraft: (s: ApplicationSettings) => void;
}

export function SuccessMessageSection({ draft, setDraft }: Props) {
  return (
    <section>
      <h2 className="text-base font-medium mb-1">Bevestigingsbericht</h2>
      <p className="text-sm text-muted-foreground mb-4">Wat zien kandidaten na het versturen?</p>
      <Textarea
        value={draft.success_message}
        onChange={(e) => setDraft({ ...draft, success_message: e.target.value })}
        rows={4}
        maxLength={400}
        className="resize-none"
        placeholder="Bedankt voor je sollicitatie! We nemen zo snel mogelijk contact met je op."
      />
      <p className="text-xs text-muted-foreground mt-1 text-right">{draft.success_message.length}/400</p>
    </section>
  );
}