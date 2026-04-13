import { WasteRegistreerForm } from "./WasteRegistreerForm";
import { WasteOverzicht } from "./WasteOverzicht";

export function WasteTab() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Registreren
        </h3>
        <WasteRegistreerForm />
      </section>

      <div className="border-t border-border/50" />

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Overzicht
        </h3>
        <WasteOverzicht />
      </section>
    </div>
  );
}
