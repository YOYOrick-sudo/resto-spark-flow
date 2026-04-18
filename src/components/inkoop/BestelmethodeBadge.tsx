import { Mail, Plug, Upload, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export type BestelMethode = "email" | "api" | "portal" | "handmatig";

export const BESTELMETHODE_META: Record<
  BestelMethode,
  { label: string; helper: string; icon: typeof Mail; tone: string }
> = {
  email: {
    label: "E-mail",
    helper: "Bestelling wordt per e-mail naar leverancier gestuurd",
    icon: Mail,
    tone: "bg-[hsl(217_91%_60%/0.10)] text-[hsl(217_91%_50%)] border-[hsl(217_91%_60%/0.25)]",
  },
  api: {
    label: "API",
    helper: "Nog niet beschikbaar — toekomstige directe koppeling met Sligro/Bidfood/Hanos",
    icon: Plug,
    tone: "bg-[hsl(142_71%_45%/0.10)] text-[hsl(142_71%_35%)] border-[hsl(142_71%_45%/0.25)]",
  },
  portal: {
    label: "Portal",
    helper: "Nog niet beschikbaar — export naar leverancier-portal (CSV/XML)",
    icon: Upload,
    tone: "bg-[hsl(262_83%_58%/0.10)] text-[hsl(262_83%_48%)] border-[hsl(262_83%_58%/0.25)]",
  },
  handmatig: {
    label: "Handmatig",
    helper: "Systeem markeert als verzonden, chef neemt zelf contact op (telefoon/WhatsApp)",
    icon: Phone,
    tone: "bg-muted text-muted-foreground border-border",
  },
};

interface Props {
  methode: BestelMethode;
  size?: "sm" | "md";
  className?: string;
}

export function BestelmethodeBadge({ methode, size = "md", className }: Props) {
  const meta = BESTELMETHODE_META[methode];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        meta.tone,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {meta.label}
    </span>
  );
}
