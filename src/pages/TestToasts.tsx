import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Variant A V4: Whisper (bottom-center) ──

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
    ), { position: "bottom-center" }),
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
    ), { position: "bottom-center" }),
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
    ), { position: "bottom-center" }),
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
    ), { position: "bottom-center" }),
};

// ── Variant B V4: Inline Status ──

const toastB = {
  success: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/[0.03] border-l-2 border-success/40 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] px-3 py-2 flex items-center max-w-[300px]">
          <p className="text-[13px] font-normal text-foreground/70">{msg}</p>
        </div>
      ),
      { position: "bottom-center", duration: 3000 }
    ),
  error: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/[0.03] border-l-2 border-error/40 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] px-3 py-2 flex items-center max-w-[300px]">
          <p className="text-[13px] font-normal text-foreground/70">{msg}</p>
        </div>
      ),
      { position: "bottom-center", duration: 3000 }
    ),
  warning: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/[0.03] border-l-2 border-warning/40 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] px-3 py-2 flex items-center max-w-[300px]">
          <p className="text-[13px] font-normal text-foreground/70">{msg}</p>
        </div>
      ),
      { position: "bottom-center", duration: 3000 }
    ),
  info: (msg: string) =>
    toast.custom(
      () => (
        <div className="bg-foreground/[0.03] border-l-2 border-primary/40 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.03)] px-3 py-2 flex items-center max-w-[300px]">
          <p className="text-[13px] font-normal text-foreground/70">{msg}</p>
        </div>
      ),
      { position: "bottom-center", duration: 3000 }
    ),
};

// ── Page ──

export default function TestToasts() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Toast Varianten V4</h1>
        <p className="text-muted-foreground text-sm mt-1">Bottom-center positie. Vergelijk Whisper vs Inline Status.</p>
      </div>

      {/* Variant A */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Variant A — Whisper</h2>
          <p className="text-sm text-muted-foreground">Subtiele card, nu bottom-center. Gedempte iconen en tekst.</p>
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
          <h2 className="text-lg font-medium text-foreground">Variant B — Inline Status</h2>
          <p className="text-sm text-muted-foreground">Ultra-minimaal. Alleen tekst + gekleurd streepje links. 3s auto-dismiss.</p>
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
