import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Kleurmapping ──

const variantStyles = {
  success: "text-success",
  error:   "text-error",
  warning: "text-warning",
  info:    "text-primary",
} as const;

type ToastVariant = keyof typeof variantStyles;

function nestoToast(variant: ToastVariant, title: string, desc?: string) {
  return toast.custom((t) => (
    <div className="group bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-border/20 dark:border-border/40 px-4 py-3.5 flex items-start gap-3 min-w-[280px] max-w-[380px]">
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium tracking-tight leading-tight ${variantStyles[variant]}`}>{title}</p>
        {desc && <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">{desc}</p>}
      </div>
      <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ), { position: "bottom-right" });
}

// ── Page ──

export default function TestToasts() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Toast V8</h1>
        <p className="text-muted-foreground text-sm mt-1">Pure typografie. Geen dot, geen borders — alleen gekleurde titel als status-indicator.</p>
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
