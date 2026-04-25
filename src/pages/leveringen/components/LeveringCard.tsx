import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Snowflake, Thermometer, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { formatLeveringDatumInbox } from "@/pages/leveringen/utils/formatLeveringDatum";
import type { GoodsReceiptInboxRow } from "@/hooks/useGoodsReceipts";

interface LeveringCardProps {
  levering: GoodsReceiptInboxRow;
}

export function LeveringCard({ levering }: LeveringCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/leveringen/${levering.id}`);
  };

  const confidence = levering.ai_parse_confidence ?? null;
  const confidenceLabel =
    confidence === null
      ? null
      : confidence >= 0.9
      ? "AI hoog"
      : confidence >= 0.7
      ? "AI middel"
      : "AI laag";
  const confidenceVariant: "success" | "warning" | "error" =
    confidence === null
      ? "warning"
      : confidence >= 0.9
      ? "success"
      : confidence >= 0.7
      ? "warning"
      : "error";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group w-full text-left bg-card border border-border rounded-2xl",
        "px-5 py-4 transition-all duration-200",
        "hover:border-primary/40 hover:shadow-md",
        "active:scale-[0.99] active:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "min-h-[60px]"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Truck className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {levering.leverancier_naam ?? "Onbekende leverancier"}
            </h3>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>

          <div className="text-small text-muted-foreground mb-2.5 flex items-center gap-2 flex-wrap">
            {levering.pakbon_nummer && (
              <span className="font-mono text-xs">#{levering.pakbon_nummer}</span>
            )}
            {levering.pakbon_nummer && <span aria-hidden>•</span>}
            <span>{formatLeveringDatumInbox(levering.levering_datum)}</span>
            <span aria-hidden>•</span>
            <span>{levering.regels_count} regels</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {levering.leverancier_warning && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-medium"
                title={levering.leverancier_warning_reason ?? "Controleer leverancier"}
              >
                <AlertTriangle className="h-3 w-3" />
                Check leverancier
              </span>
            )}
            {confidenceLabel && (
              <NestoBadge variant={confidenceVariant} size="sm">
                {confidenceLabel}
              </NestoBadge>
            )}
            {levering.has_gekoeld && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                title="Gekoelde producten"
              >
                <Thermometer className="h-3 w-3" />
                Gekoeld
              </span>
            )}
            {levering.has_vries && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                title="Diepvriesproducten"
              >
                <Snowflake className="h-3 w-3" />
                Vries
              </span>
            )}
            {levering.has_risicogroep && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium"
                title="Risicogroep — strikte temperatuur-eis"
              >
                <AlertTriangle className="h-3 w-3" />
                Risicogroep
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
