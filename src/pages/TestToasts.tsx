import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Variant A V3: Whisper ──

const toastA = {
  success: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/25 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.25)] dark:border-border/40 px-3 py-2 flex items-center gap-2.5 min-w-[260px] max-w-[360px]">
        <CheckCircle2 className="h-[14px] w-[14px] text-success/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-normal text-foreground/80">{msg}</p>
          {desc && <p className="text-[11px] text-muted-foreground/70 mt-px">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/30 hover:text-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <X className="h-3 w-3" />
        </button>
      </div>
    )),
  error: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/25 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.25)] dark:border-border/40 px-3 py-2 flex items-center gap-2.5 min-w-[260px] max-w-[360px]">
        <XCircle className="h-[14px] w-[14px] text-error/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-normal text-foreground/80">{msg}</p>
          {desc && <p className="text-[11px] text-muted-foreground/70 mt-px">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/30 hover:text-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <X className="h-3 w-3" />
        </button>
      </div>
    )),
  warning: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/25 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.25)] dark:border-border/40 px-3 py-2 flex items-center gap-2.5 min-w-[260px] max-w-[360px]">
        <AlertTriangle className="h-[14px] w-[14px] text-warning/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-normal text-foreground/80">{msg}</p>
          {desc && <p className="text-[11px] text-muted-foreground/70 mt-px">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/30 hover:text-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <X className="h-3 w-3" />
        </button>
      </div>
    )),
  info: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/25 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.25)] dark:border-border/40 px-3 py-2 flex items-center gap-2.5 min-w-[260px] max-w-[360px]">
        <Info className="h-[14px] w-[14px] text-primary/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-normal text-foreground/80">{msg}</p>
          {desc && <p className="text-[11px] text-muted-foreground/70 mt-px">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/30 hover:text-foreground/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <X className="h-3 w-3" />
        </button>
      </div>
    )),
};

// ── Variant B V3: Ghost Bar ──

const toastB = {
  success: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/80 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] px-3.5 py-2 flex items-center gap-2 min-w-[220px] max-w-[320px]">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" />
          <p className="text-[13px] font-normal text-background/90">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  error: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/80 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] px-3.5 py-2 flex items-center gap-2 min-w-[220px] max-w-[320px]">
          <XCircle className="h-3.5 w-3.5 text-rose-400/80 shrink-0" />
          <p className="text-[13px] font-normal text-background/90">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  warning: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/80 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] px-3.5 py-2 flex items-center gap-2 min-w-[220px] max-w-[320px]">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
          <p className="text-[13px] font-normal text-background/90">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  info: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/80 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] px-3.5 py-2 flex items-center gap-2 min-w-[220px] max-w-[320px]">
          <Info className="h-3.5 w-3.5 text-teal-400/80 shrink-0" />
          <p className="text-[13px] font-normal text-background/90">{msg}</p>
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
        <h1 className="text-2xl font-semibold text-foreground">Toast Varianten V3</h1>
        <p className="text-muted-foreground text-sm mt-1">Nog subtieler. Vergelijk de twee stijlen.</p>
      </div>

      {/* Variant A */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant A — Whisper</h2>
          <p className="text-sm text-muted-foreground">Bijna onzichtbaar. Gedempte iconen, lichtere tekst, minimale shadow.</p>
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
          <h2 className="text-lg font-medium text-foreground">Variant B — Ghost Bar</h2>
          <p className="text-sm text-muted-foreground">Semi-transparant, gedempte kleuren, lichter gewicht.</p>
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
