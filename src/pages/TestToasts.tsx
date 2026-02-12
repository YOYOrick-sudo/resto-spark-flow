import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Variant A V5: Nesto Polar Enterprise ──
// Inspired by reference: clean card, bold title, muted description, colored left border, close on hover

const variantColors = {
  success: "border-l-success/60",
  error: "border-l-error/60",
  warning: "border-l-warning/60",
  info: "border-l-primary/60",
} as const;

function nestoToast(variant: keyof typeof variantColors, title: string, desc?: string) {
  return toast.custom((t) => (
    <div className={`group bg-card border border-border/30 ${variantColors[variant]} border-l-[3px] rounded-card-sm shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] dark:border-border/50 px-4 py-3 flex items-start gap-3 min-w-[300px] max-w-[400px]`}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight">{title}</p>
        {desc && <p className="text-[12px] text-foreground/70 mt-0.5 leading-snug">{desc}</p>}
      </div>
      <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ), { position: "bottom-right" });
}

const toastA = {
  success: (title: string, desc?: string) => nestoToast("success", title, desc),
  error: (title: string, desc?: string) => nestoToast("error", title, desc),
  warning: (title: string, desc?: string) => nestoToast("warning", title, desc),
  info: (title: string, desc?: string) => nestoToast("info", title, desc),
};

// ── Variant B V5: Inline Status (minimaal, bottom-center) ──

const inlineColors = {
  success: "border-l-success/40",
  error: "border-l-error/40",
  warning: "border-l-warning/40",
  info: "border-l-primary/40",
} as const;

function inlineToast(variant: keyof typeof inlineColors, msg: string) {
  return toast.custom(
    () => (
      <div className={`bg-foreground/[0.03] ${inlineColors[variant]} border-l-2 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] px-3 py-2 flex items-center max-w-[300px]`}>
        <p className="text-[13px] font-normal text-foreground/70">{msg}</p>
      </div>
    ),
    { position: "bottom-center", duration: 3000 }
  );
}

const toastB = {
  success: (msg: string) => inlineToast("success", msg),
  error: (msg: string) => inlineToast("error", msg),
  warning: (msg: string) => inlineToast("warning", msg),
  info: (msg: string) => inlineToast("info", msg),
};

// ── Page ──

export default function TestToasts() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Toast Varianten V5</h1>
        <p className="text-muted-foreground text-sm mt-1">Enterprise Polar stijl. Vergelijk card (rechtsonder) vs inline (bottom-center).</p>
      </div>

      {/* Variant A */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant A — Nesto Polar Card</h2>
          <p className="text-sm text-muted-foreground">Rechtsonder. Clean card met gekleurde left-border, bold titel, muted beschrijving.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toastA.success("Area aangemaakt", "De nieuwe area is beschikbaar")}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => toastA.error("Fout bij opslaan", "Controleer je invoer en probeer opnieuw")}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => toastA.warning("Let op: capaciteit bijna vol", "Nog 2 tafels beschikbaar voor deze shift")}>Warning</Button>
          <Button variant="outline" size="sm" onClick={() => toastA.info("Nieuwe versie beschikbaar", "Vernieuw de pagina om bij te werken")}>Info</Button>
        </div>
      </section>

      {/* Variant B */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant B — Inline Status</h2>
          <p className="text-sm text-muted-foreground">Bottom-center. Ultra-minimaal met gekleurd streepje. 3s auto-dismiss.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toastB.success("Area aangemaakt")}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => toastB.error("Fout bij opslaan")}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => toastB.warning("Wijzigingen niet opgeslagen")}>Warning</Button>
          <Button variant="outline" size="sm" onClick={() => toastB.info("Nieuwe versie beschikbaar")}>Info</Button>
        </div>
      </section>
    </div>
  );
}
