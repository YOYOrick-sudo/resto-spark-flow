import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Kleurmapping ──

const variantStyles = {
  success: { dot: "bg-success/50", title: "text-success/80" },
  error:   { dot: "bg-error/50",   title: "text-error/80" },
  warning: { dot: "bg-warning/50", title: "text-warning/80" },
  info:    { dot: "bg-primary/50", title: "text-primary/80" },
} as const;

type ToastVariant = keyof typeof variantStyles;

function nestoToast(variant: ToastVariant, title: string, desc?: string) {
  const styles = variantStyles[variant];
  return toast.custom((t) => (
    <div className="group bg-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)] border border-border/20 dark:border-border/40 px-5 py-4 flex items-start gap-3 min-w-[320px] max-w-[420px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
          <p className={`text-[14px] font-semibold leading-tight ${styles.title}`}>{title}</p>
        </div>
        {desc && <p className="text-[13px] text-foreground/70 mt-1 leading-snug pl-[14px]">{desc}</p>}
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
        <h1 className="text-2xl font-semibold text-foreground">Toast V7</h1>
        <p className="text-muted-foreground text-sm mt-1">Subtiele kleurindicatie via dot + gekleurde titel. Geen borders, geen gekleurde achtergrond.</p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => nestoToast("success", "Area aangemaakt", "De nieuwe area is beschikbaar")}>Success</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast("error", "Fout bij opslaan", "Controleer je invoer en probeer opnieuw")}>Error</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast("warning", "Capaciteit bijna vol", "Nog 2 tafels beschikbaar voor deze shift")}>Warning</Button>
          <Button variant="outline" size="sm" onClick={() => nestoToast("info", "Nieuwe versie beschikbaar")}>Info</Button>
        </div>
      </section>
    </div>
  );
}
