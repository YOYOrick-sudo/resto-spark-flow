import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Variant A V6: Clean Card (zoals referentie) ──

function nestoToast(title: string, desc?: string) {
  return toast.custom((t) => (
    <div className="group bg-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)] border border-border/20 dark:border-border/40 px-5 py-4 flex items-start gap-3 min-w-[320px] max-w-[420px]">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground leading-tight">{title}</p>
        {desc && <p className="text-[13px] text-foreground/70 mt-1 leading-snug">{desc}</p>}
      </div>
      <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  ), { position: "bottom-right" });
}

// ── Variant B V6: Clean Card + Warning accent ──

const accentColors = {
  success: "border-l-success/50",
  error: "border-l-error/50",
  warning: "border-l-warning/50",
  info: "border-l-primary/50",
} as const;

function nestoAccentToast(variant: keyof typeof accentColors, title: string, desc?: string) {
  return toast.custom((t) => (
    <div className={`group bg-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)] border border-border/20 dark:border-border/40 ${accentColors[variant]} border-l-[3px] px-5 py-4 flex items-start gap-3 min-w-[320px] max-w-[420px]`}>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground leading-tight">{title}</p>
        {desc && <p className="text-[13px] text-foreground/70 mt-1 leading-snug">{desc}</p>}
      </div>
      <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  ), { position: "bottom-right" });
}

// ── Page ──

export default function TestToasts() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Toast Varianten V6</h1>
        <p className="text-muted-foreground text-sm mt-1">Rechtsonder. Clean enterprise card. Vergelijk zonder vs met kleur-accent.</p>
      </div>

      {/* Variant A — Clean (geen accent) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant A — Clean Card</h2>
          <p className="text-sm text-muted-foreground">Grote ronde hoeken, zachte shadow, bold titel, geen kleur-accent. Zoals je voorbeeld.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => nestoToast("Area aangemaakt", "De nieuwe area is beschikbaar")}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast("Fout bij opslaan", "Controleer je invoer en probeer opnieuw")}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast("Let op: capaciteit bijna vol", "Nog 2 tafels beschikbaar voor deze shift")}>Warning</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast("Nieuwe versie beschikbaar")}>Info</Button>
        </div>
      </section>

      {/* Variant B — Met kleur-accent */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant B — Met kleur-accent</h2>
          <p className="text-sm text-muted-foreground">Zelfde card maar met een subtiel 3px gekleurd streepje links per type.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => nestoAccentToast("success", "Area aangemaakt", "De nieuwe area is beschikbaar")}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => nestoAccentToast("error", "Fout bij opslaan", "Controleer je invoer en probeer opnieuw")}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => nestoAccentToast("warning", "Let op: capaciteit bijna vol", "Nog 2 tafels beschikbaar")}>Warning</Button>
          <Button variant="outline" size="sm" onClick={() => nestoAccentToast("info", "Nieuwe versie beschikbaar")}>Info</Button>
        </div>
      </section>
    </div>
  );
}
