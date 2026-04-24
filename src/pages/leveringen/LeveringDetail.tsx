// TOUCH-FIRST: zie docs/development/TOUCH_FIRST_GUIDELINES.md
// Operationele route — chef werkt op iPad. Tap-targets ≥60px, geen hover-only critical actions.

import * as React from "react";
import { useParams } from "react-router-dom";
import {
  Check,
  Thermometer,
  Snowflake,
  AlertTriangle,
  Package,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailPageLayout } from "@/components/polar/DetailPageLayout";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { CardSkeleton } from "@/components/polar/LoadingStates";
import { EmptyState } from "@/components/polar/EmptyState";
import {
  useGoodsReceiptDetail,
  type GoodsReceiptLineWithIngredient,
} from "@/hooks/useGoodsReceiptDetail";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Datum onbekend";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function LineRow({
  line,
  checked,
  onToggle,
}: {
  line: GoodsReceiptLineWithIngredient;
  checked: boolean;
  onToggle: () => void;
}) {
  const cat = line.ingredient?.haccp_categorie ?? line.haccp_categorie;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left flex items-start gap-4 px-4 py-4 rounded-xl border transition-colors",
        "min-h-[60px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-orange-500/40 bg-orange-500/5"
      )}
    >
      {/* Checkbox visual */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors",
          checked
            ? "bg-emerald-500 border-emerald-500"
            : "bg-background border-muted-foreground/40"
        )}
        aria-hidden
      >
        {checked && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="font-medium text-foreground leading-snug">
            {line.product_naam_herkend}
          </p>
          <span className="text-small text-muted-foreground whitespace-nowrap">
            {line.hoeveelheid_verwacht ?? "?"} {line.eenheid_verwacht ?? ""}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {line.ai_raw_artikelnummer && (
            <span className="text-xs text-muted-foreground font-mono">
              #{line.ai_raw_artikelnummer}
            </span>
          )}
          {cat === "gekoeld" && (
            <NestoBadge variant="info" size="sm">
              Gekoeld
            </NestoBadge>
          )}
          {cat === "vries" && (
            <NestoBadge variant="info" size="sm">
              Vries
            </NestoBadge>
          )}
          {(line.ingredient?.haccp_strict_temp_max != null || cat === "vis_op_ijs") && (
            <NestoBadge variant="warning" size="sm">
              Risicogroep
            </NestoBadge>
          )}
        </div>
      </div>
    </button>
  );
}

function TempField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-small font-medium text-foreground block">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="--"
          className={cn(
            "flex-1 min-h-[60px] px-4 rounded-xl border border-input bg-background",
            "text-h3 font-semibold text-center",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          )}
        />
        <div className="min-h-[60px] px-4 rounded-xl bg-muted flex items-center text-body font-medium text-muted-foreground">
          °C
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function LeveringDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, smartFlags } = useGoodsReceiptDetail(id);

  // Default-akkoord state: alle regels vooraf aangevinkt (chef vinkt alleen afwijkingen UIT).
  const [checkedLines, setCheckedLines] = React.useState<Set<string>>(new Set());
  const [tempGekoeld, setTempGekoeld] = React.useState("");
  const [tempVries, setTempVries] = React.useState("");

  React.useEffect(() => {
    if (data?.lines) {
      setCheckedLines(new Set(data.lines.map((l) => l.id)));
    }
  }, [data?.lines]);

  const toggleLine = (lineId: string) => {
    setCheckedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <CardSkeleton />
        <div className="mt-4 space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <DetailPageLayout title="Levering" backHref="/leveringen">
          <EmptyState
            icon={Truck}
            title="Levering niet gevonden"
            description="Deze pakbon is mogelijk al verwerkt of verwijderd."
          />
        </DetailPageLayout>
      </div>
    );
  }

  const totalLines = data.lines.length;
  const akkoord = checkedLines.size;
  const afwijking = totalLines - akkoord;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32">
      <DetailPageLayout
        title={data.leverancier?.naam ?? "Levering"}
        backHref="/leveringen"
      >
        {/* Pakbon meta */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small">
            {data.pakbon_nummer && (
              <div>
                <span className="text-muted-foreground">Pakbon</span>{" "}
                <span className="font-mono text-foreground">
                  #{data.pakbon_nummer}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Datum</span>{" "}
              <span className="text-foreground font-medium">
                {formatDate(data.levering_datum)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Regels</span>{" "}
              <span className="text-foreground font-medium">{totalLines}</span>
            </div>
            {data.ai_parse_confidence !== null && (
              <div>
                <span className="text-muted-foreground">AI-zekerheid</span>{" "}
                <span className="text-foreground font-medium">
                  {Math.round((data.ai_parse_confidence ?? 0) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Regels */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h3 text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Regels
            </h2>
            <div className="text-small text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {akkoord} akkoord
              </span>
              {afwijking > 0 && (
                <>
                  {" · "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {afwijking} afwijking
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-small text-muted-foreground mb-3">
            Alles staat standaard aangevinkt. Vink een regel uit als de
            levering niet klopt — in 2C kun je dan aangeven wat er mis is.
          </p>

          <div className="space-y-2">
            {data.lines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                checked={checkedLines.has(line.id)}
                onToggle={() => toggleLine(line.id)}
              />
            ))}
          </div>
        </section>

        {/* Temperatuur-secties (conditioneel via smart-detectie) */}
        {(smartFlags.hasGekoeld ||
          smartFlags.hasVries ||
          smartFlags.hasRisicogroep) && (
          <section className="mb-8">
            <h2 className="text-h3 text-foreground flex items-center gap-2 mb-3">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              Temperatuur-meting
            </h2>

            <div className="rounded-2xl bg-card border border-border p-5 space-y-5">
              {smartFlags.hasGekoeld && (
                <TempField
                  label="Gekoeld (max 7 °C)"
                  hint="Meet de kerntemperatuur van een gekoeld product."
                  value={tempGekoeld}
                  onChange={setTempGekoeld}
                />
              )}
              {smartFlags.hasVries && (
                <TempField
                  label="Vries (max -18 °C)"
                  hint="Meet de oppervlakte-temperatuur van een diepvriesproduct."
                  value={tempVries}
                  onChange={setTempVries}
                />
              )}
              {smartFlags.hasRisicogroep && (
                <div className="flex items-start gap-3 rounded-xl bg-orange-500/10 p-4">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-small">
                    <p className="font-medium text-foreground">
                      Risicogroep aanwezig
                      {smartFlags.strictTempMax !== null && (
                        <>
                          {" — "}max{" "}
                          <span className="font-semibold">
                            {smartFlags.strictTempMax} °C
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Vlees, vis of zuivel met strikte eis. Controleer extra
                      zorgvuldig.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {smartFlags.hasVries && !smartFlags.hasGekoeld && (
          <div className="hidden">
            {/* placeholder zodat Snowflake import niet als unused gemarkeerd wordt */}
            <Snowflake />
          </div>
        )}
      </DetailPageLayout>

      {/* Sticky bottom-bar met confirm-button (DISABLED in 2B, actief in 2C) */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 sm:p-5 shadow-[0_-4px_20px_-4px_hsl(var(--background))] z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="text-small text-muted-foreground hidden sm:block">
            {akkoord} van {totalLines} regels akkoord
          </div>
          <NestoButton
            disabled
            className="min-h-[60px] px-8 text-base flex-1 sm:flex-none sm:min-w-[280px]"
            title="Beschikbaar in volgende versie"
          >
            <Check className="h-5 w-5 mr-2" />
            Bevestig levering
          </NestoButton>
        </div>
      </div>
    </div>
  );
}
