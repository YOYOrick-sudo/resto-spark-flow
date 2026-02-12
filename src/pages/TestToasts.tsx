import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Variant A: Minimal Icon (Linear-style) ──

const toastA = {
  success: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="bg-card border border-border/60 rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] px-3.5 py-3 flex items-start gap-3 min-w-[320px] max-w-[420px]">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[13px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/60 hover:text-foreground shrink-0 mt-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
  error: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="bg-card border border-border/60 rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] px-3.5 py-3 flex items-start gap-3 min-w-[320px] max-w-[420px]">
        <XCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[13px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/60 hover:text-foreground shrink-0 mt-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
  warning: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="bg-card border border-border/60 rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] px-3.5 py-3 flex items-start gap-3 min-w-[320px] max-w-[420px]">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[13px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/60 hover:text-foreground shrink-0 mt-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
  info: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="bg-card border border-border/60 rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] px-3.5 py-3 flex items-start gap-3 min-w-[320px] max-w-[420px]">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[13px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/60 hover:text-foreground shrink-0 mt-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
};

// ── Variant B: Pill Snackbar (Vercel-style) ──

const toastB = {
  success: (msg: string) =>
    toast.custom(
      (t) => (
        <div className="bg-foreground text-background rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.15)] py-2.5 px-4 flex items-center gap-2.5 min-w-[200px] max-w-[360px]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <p className="text-sm font-medium">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  error: (msg: string) =>
    toast.custom(
      (t) => (
        <div className="bg-foreground text-background rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.15)] py-2.5 px-4 flex items-center gap-2.5 min-w-[200px] max-w-[360px]">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <p className="text-sm font-medium">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  warning: (msg: string) =>
    toast.custom(
      (t) => (
        <div className="bg-foreground text-background rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.15)] py-2.5 px-4 flex items-center gap-2.5 min-w-[200px] max-w-[360px]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <p className="text-sm font-medium">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  info: (msg: string) =>
    toast.custom(
      (t) => (
        <div className="bg-foreground text-background rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.15)] py-2.5 px-4 flex items-center gap-2.5 min-w-[200px] max-w-[360px]">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <p className="text-sm font-medium">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
};

// ── Page ──

export default function TestToasts() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Toast Varianten</h1>
        <p className="text-muted-foreground text-sm mt-1">Klik op een knop om de toast te triggeren. Vergelijk de twee stijlen.</p>
      </div>

      {/* Variant A */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant A — Minimal Icon</h2>
          <p className="text-sm text-muted-foreground">Linear-stijl. Subtiel icoon, neutrale tekst, card-achtig.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toastA.success("Area aangemaakt", "De nieuwe area is beschikbaar")}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => toastA.error("Fout bij opslaan", "Controleer je invoer en probeer opnieuw")}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => toastA.warning("Wijzigingen niet opgeslagen")}>Warning</Button>
          <Button variant="outline" size="sm" onClick={() => toastA.info("Nieuwe versie beschikbaar")}>Info</Button>
        </div>
      </section>

      {/* Variant B */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant B — Pill Snackbar</h2>
          <p className="text-sm text-muted-foreground">Vercel-stijl. Donkere pill, ultra-compact, bottom-center.</p>
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
