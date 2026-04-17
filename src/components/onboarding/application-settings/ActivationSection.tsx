import { Switch } from '@/components/ui/switch';
import type { ApplicationSettings } from '@/hooks/useApplicationSettings';

interface Props {
  draft: ApplicationSettings;
  setDraft: (s: ApplicationSettings) => void;
}

export function ActivationSection({ draft, setDraft }: Props) {
  return (
    <section>
      <h2 className="text-base font-medium mb-1">Status</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Pagina's zijn standaard offline. Activeer pas wanneer je klaar bent om kandidaten te ontvangen.
      </p>
      <div
        className={`flex items-center justify-between gap-4 p-4 rounded-card border ${
          draft.is_active ? 'bg-success/5 border-success/30' : 'bg-secondary/50 border-border'
        }`}
      >
        <div>
          <p className="text-sm font-medium">{draft.is_active ? 'Pagina is live' : 'Pagina is offline'}</p>
          <p className="text-xs text-muted-foreground">
            {draft.is_active
              ? 'Kandidaten kunnen het formulier zien en invullen.'
              : 'Bezoekers krijgen een "niet beschikbaar"-melding.'}
          </p>
        </div>
        <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
      </div>
    </section>
  );
}