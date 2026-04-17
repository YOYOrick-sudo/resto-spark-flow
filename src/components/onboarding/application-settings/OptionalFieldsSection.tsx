import { Switch } from '@/components/ui/switch';
import type { ApplicationSettings } from '@/hooks/useApplicationSettings';

interface Props {
  draft: ApplicationSettings;
  setDraft: (s: ApplicationSettings) => void;
}

export function OptionalFieldsSection({ draft, setDraft }: Props) {
  return (
    <section>
      <h2 className="text-base font-medium mb-1">Optionele velden</h2>
      <p className="text-sm text-muted-foreground mb-4">Welke extra vragen wil je stellen?</p>
      <div className="space-y-3">
        <Row
          label="Aantal uur per week"
          desc="Kandidaat kiest tussen Bijbaan, Parttime, Fulltime of Flexibel."
          checked={draft.show_hours}
          onChange={(v) => setDraft({ ...draft, show_hours: v })}
        />
        <Row
          label="Startdatum"
          desc="Kandidaat geeft aan wanneer hij/zij beschikbaar is."
          checked={draft.show_start_date}
          onChange={(v) => setDraft({ ...draft, show_start_date: v })}
        />
      </div>
    </section>
  );
}

function Row({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}