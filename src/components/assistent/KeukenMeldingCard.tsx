import { useNavigate } from "react-router-dom";
import { NestoButton } from "@/components/polar/NestoButton";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { KeukenMelding } from "@/hooks/useKeukenMeldingen";
import { cn } from "@/lib/utils";

interface KeukenMeldingCardProps {
  melding: KeukenMelding;
  onAction?: () => void;
}

const SEVERITY_STYLES = {
  error: "bg-destructive/[0.06] border-destructive/20",
  warning: "bg-amber-500/[0.06] border-amber-500/20",
  info: "bg-primary/[0.06] border-primary/20",
};

const SEVERITY_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function KeukenMeldingCard({ melding, onAction }: KeukenMeldingCardProps) {
  const navigate = useNavigate();
  const Icon = SEVERITY_ICONS[melding.severity];

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (melding.actie_path) {
      navigate(melding.actie_path);
    }
  };

  return (
    <div className={cn("border rounded-xl p-4 transition-colors", SEVERITY_STYLES[melding.severity])}>
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{melding.titel}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{melding.beschrijving}</p>
          {melding.waarde != null && melding.waarde > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Geschatte waarde: €{melding.waarde.toFixed(2)}
            </p>
          )}
          {melding.actie_label && (
            <div className="mt-2.5">
              <NestoButton size="sm" variant="outline" onClick={handleAction}>
                {melding.actie_label}
              </NestoButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
