import { nestoToast } from "@/lib/nestoToast";
import { Button } from "@/components/ui/button";

export default function TestToasts() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Toast V8</h1>
        <p className="text-muted-foreground text-sm mt-1">Pure typografie. Geen dot, geen borders — alleen gekleurde titel als status-indicator.</p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => nestoToast.success("Area aangemaakt", "De nieuwe area is beschikbaar")}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast.error("Fout bij opslaan", "Controleer je invoer en probeer opnieuw")}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast.warning("Capaciteit bijna vol", "Nog 2 tafels beschikbaar voor deze shift")}>Warning</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast.info("Nieuwe versie beschikbaar")}>Info</Button>
        </div>
      </section>
    </div>
  );
}
