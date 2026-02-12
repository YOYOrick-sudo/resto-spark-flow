import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Variant A V2: Notion Inline ──

const toastA = {
  success: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.15)] dark:border-border/60 px-3 py-2.5 flex items-start gap-2.5 min-w-[280px] max-w-[380px]">
        <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-[15px] w-[15px] text-success" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[13px] font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
  error: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.15)] dark:border-border/60 px-3 py-2.5 flex items-start gap-2.5 min-w-[280px] max-w-[380px]">
        <div className="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center shrink-0">
          <XCircle className="h-[15px] w-[15px] text-error" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[13px] font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
  warning: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.15)] dark:border-border/60 px-3 py-2.5 flex items-start gap-2.5 min-w-[280px] max-w-[380px]">
        <div className="w-6 h-6 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-[15px] w-[15px] text-warning" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[13px] font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
  info: (msg: string, desc?: string) =>
    toast.custom((t) => (
      <div className="group bg-popover border border-border/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.15)] dark:border-border/60 px-3 py-2.5 flex items-start gap-2.5 min-w-[280px] max-w-[380px]">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Info className="h-[15px] w-[15px] text-primary" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[13px] font-medium text-foreground">{msg}</p>
          {desc && <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )),
};

// ── Variant B V2: Glass Bar ──

const toastB = {
  success: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.1)] px-4 py-2.5 flex items-center gap-2.5 min-w-[240px] max-w-[360px]">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
          <p className="text-sm font-medium text-background">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  error: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.1)] px-4 py-2.5 flex items-center gap-2.5 min-w-[240px] max-w-[360px]">
          <XCircle className="h-3.5 w-3.5 text-rose-300 shrink-0" />
          <p className="text-sm font-medium text-background">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  warning: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.1)] px-4 py-2.5 flex items-center gap-2.5 min-w-[240px] max-w-[360px]">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <p className="text-sm font-medium text-background">{msg}</p>
        </div>
      ),
      { position: "bottom-center" }
    ),
  info: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.1)] px-4 py-2.5 flex items-center gap-2.5 min-w-[240px] max-w-[360px]">
          <Info className="h-3.5 w-3.5 text-teal-300 shrink-0" />
          <p className="text-sm font-medium text-background">{msg}</p>
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
        <h1 className="text-2xl font-semibold text-foreground">Toast Varianten V2</h1>
        <p className="text-muted-foreground text-sm mt-1">Enterprise-grade toasts. Vergelijk de twee stijlen.</p>
      </div>

      {/* Variant A */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant A — Notion Inline</h2>
          <p className="text-sm text-muted-foreground">Ultra-subtiel. Icoon in soft circle, hover-to-close, diepere shadow.</p>
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
          <h2 className="text-lg font-medium text-foreground">Variant B — Glass Bar</h2>
          <p className="text-sm text-muted-foreground">Frosted glass, backdrop-blur, bottom-center, auto-dismiss.</p>
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
