import { toast } from "sonner";
import { X } from "lucide-react";

const variantStyles = {
  success: "text-success",
  error:   "text-error",
  warning: "text-warning",
  info:    "text-primary",
} as const;

type ToastVariant = keyof typeof variantStyles;

type ToastOpts = {
  action?: { label: string; onClick: () => void };
};

function fireToast(variant: ToastVariant, title: string, desc?: string, opts?: ToastOpts) {
  return toast.custom((t) => (
    <div className="group bg-card rounded-2xl shadow-toast dark:shadow-toast-dark border border-border/20 dark:border-border/40 px-4 py-3.5 flex items-start gap-3 min-w-[280px] max-w-[380px]">
      <div className="flex-1 min-w-0">
        <p className={`text-small font-medium tracking-tight leading-tight ${variantStyles[variant]}`}>{title}</p>
        {desc && <p className="text-small text-muted-foreground mt-1 leading-snug">{desc}</p>}
        {opts?.action && (
          <button
            onClick={() => {
              opts.action!.onClick();
              toast.dismiss(t);
            }}
            className="mt-2 text-small font-medium text-primary hover:underline"
          >
            {opts.action.label}
          </button>
        )}
      </div>
      <button onClick={() => toast.dismiss(t)} className="text-muted-foreground/40 hover:text-foreground/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ), { position: "bottom-right" });
}

export const nestoToast = {
  success: (title: string, desc?: string, opts?: ToastOpts) => fireToast("success", title, desc, opts),
  error:   (title: string, desc?: string, opts?: ToastOpts) => fireToast("error", title, desc, opts),
  warning: (title: string, desc?: string, opts?: ToastOpts) => fireToast("warning", title, desc, opts),
  info:    (title: string, desc?: string, opts?: ToastOpts) => fireToast("info", title, desc, opts),
};
