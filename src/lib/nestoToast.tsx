import { toast } from "sonner";
import { X } from "lucide-react";

const variantStyles = {
  success: "text-success",
  error:   "text-error",
  warning: "text-warning",
  info:    "text-primary",
} as const;

type ToastVariant = keyof typeof variantStyles;

function fireToast(variant: ToastVariant, title: string, desc?: string) {
  return toast.custom((t) => (
    <div className="group bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-border/20 dark:border-border/40 px-4 py-3.5 flex items-start gap-3 min-w-[280px] max-w-[380px]">
      <div className="flex-1 min-w-0">
        <p className={`text-[13.5px] font-medium tracking-tight leading-tight ${variantStyles[variant]}`}>{title}</p>
        {desc && <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{desc}</p>}
      </div>
      <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ), { position: "bottom-right" });
}

export const nestoToast = {
  success: (title: string, desc?: string) => fireToast("success", title, desc),
  error:   (title: string, desc?: string) => fireToast("error", title, desc),
  warning: (title: string, desc?: string) => fireToast("warning", title, desc),
  info:    (title: string, desc?: string) => fireToast("info", title, desc),
};
