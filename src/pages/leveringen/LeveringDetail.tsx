// TOUCH-FIRST: zie docs/development/TOUCH_FIRST_GUIDELINES.md
// Operationele route — chef werkt op iPad. Tap-targets ≥60px, geen hover-only critical actions.

import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  Thermometer,
  AlertTriangle,
  Package,
  Truck,
  X,
  Pencil,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DetailPageLayout } from "@/components/polar/DetailPageLayout";

import { NestoBadge } from "@/components/polar/NestoBadge";
import { CardSkeleton } from "@/components/polar/LoadingStates";
import { EmptyState } from "@/components/polar/EmptyState";
import {
  useGoodsReceiptDetail,
  type GoodsReceiptLineWithIngredient,
} from "@/hooks/useGoodsReceiptDetail";
import {
  useConfirmGoodsReceipt,
  type ConfirmLineInput,
  type ConfirmError,
} from "@/hooks/useConfirmGoodsReceipt";
import { formatLeveringDatumDetail } from "@/pages/leveringen/utils/formatLeveringDatum";
import { AfwijkingModal, type AfwijkingValue } from "@/pages/leveringen/components/AfwijkingModal";
import { SkipTempModal } from "@/pages/leveringen/components/SkipTempModal";
import {
  LineFactorPanel,
  type LinePackagingState,
} from "@/pages/leveringen/components/LineFactorPanel";
import { LineMatchPanel } from "@/pages/leveringen/components/LineMatchPanel";
import { LeveringConfirmCard } from "@/pages/leveringen/components/LeveringConfirmCard";
import { nestoToast } from "@/lib/nestoToast";

// Loop 4c: Nederlandse pluralisering voor verpakking-woorden.
// Bekend → expliciet plural; onbekend → raw woord (geen geforceerde -s).
const PLURAL_MAP: Record<string, string> = {
  doos: "dozen",
  kist: "kisten",
  zak: "zakken",
  pak: "pakken",
  bak: "bakken",
  tray: "trays",
  krat: "kratten",
  stuk: "stuks",
  fles: "flessen",
  rol: "rollen",
  emmer: "emmers",
};
function pluralize(woord: string, aantal: number): string {
  if (!woord) return "";
  if (aantal === 1) return woord;
  const lower = woord.toLowerCase();
  return PLURAL_MAP[lower] ?? woord;
}

// Loop 4c-polish v2: voorkom dat letterlijk "verpakking" als label opduikt
// (hook-fallback). Mappen naar "stuk(s)" zodat copy menselijk blijft.
function safeVerpakking(label: string | null | undefined, aantal: number): string {
  if (!label || label.toLowerCase() === "verpakking") {
    return pluralize("stuk", aantal);
  }
  return pluralize(label, aantal);
}

type LineState =
  | { kind: "akkoord" }
  | { kind: "afwijking"; value: AfwijkingValue };

function LineRow({
  id,
  line,
  state,
  packagingState,
  onPackagingChange,
  onMarkAfwijking,
  onResetAkkoord,
  onEditAfwijking,
  receiptId,
  leverancierId,
  locationId,
}: {
  id?: string;
  line: GoodsReceiptLineWithIngredient;
  state: LineState;
  packagingState: LinePackagingState;
  onPackagingChange: (next: LinePackagingState) => void;
  onMarkAfwijking: () => void;
  onResetAkkoord: () => void;
  onEditAfwijking: () => void;
  receiptId: string;
  leverancierId: string | null;
  locationId: string;
}) {
  const cat = line.ingredient?.haccp_categorie ?? line.haccp_categorie;
  const isRisk =
    line.ingredient?.haccp_strict_temp_max != null || cat === "vis_op_ijs";
  const isAkkoord = state.kind === "akkoord";
  const accepted = state.kind === "afwijking" && state.value.accepted_with_issue;

  const afwijkingLabel = (() => {
    if (state.kind !== "afwijking") return null;
    switch (state.value.status) {
      case "afwijking_missing":
        return "Niet geleverd";
      case "afwijking_beschadigd":
        return accepted ? "Beschadigd · geaccepteerd" : "Beschadigd";
      case "afwijking_verkeerd":
        return accepted ? "Verkeerd · geaccepteerd" : "Verkeerd product";
      case "afwijking_meer":
        return `Meer (${state.value.hoeveelheid_ontvangen ?? "?"})`;
    }
  })();

  // Loop 4c-polish v2: hele card klikbaar → opent factor-form
  const [editingFactor, setEditingFactor] = React.useState(false);
  const isStockMutation =
    state.kind === "akkoord" ||
    (state.kind === "afwijking" && !!state.value.accepted_with_issue);
  const canOpenFactor = isStockMutation && line.factor_ctx.mode !== "SKIP";

  const handleCardClick = () => {
    if (!canOpenFactor) return;
    setEditingFactor((v) => !v);
  };
  const handleCardKey = (e: React.KeyboardEvent) => {
    if (!canOpenFactor) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setEditingFactor((v) => !v);
    }
  };

  return (
    <div
      id={id}
      role={canOpenFactor ? "button" : undefined}
      tabIndex={canOpenFactor ? 0 : undefined}
      onClick={canOpenFactor ? handleCardClick : undefined}
      onKeyDown={canOpenFactor ? handleCardKey : undefined}
      aria-label={
        canOpenFactor ? `Bewerk factor voor ${line.product_naam_herkend}` : undefined
      }
      className={cn(
        "w-full flex items-start gap-4 px-4 py-4 rounded-xl border transition-colors",
        "min-h-[60px]",
        isAkkoord
          ? "border-success/30 bg-success/5"
          : accepted
          ? "border-success/40 bg-success/5"
          : "border-warning/40 bg-warning/5",
        canOpenFactor &&
          "cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* Toggle/icon — eigen click, mag card-click niet triggeren */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          (isAkkoord ? onMarkAfwijking : onResetAkkoord)();
        }}
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isAkkoord ? "bg-success border-success" : "bg-background border-warning"
        )}
        aria-label={isAkkoord ? "Markeer als afwijking" : "Zet terug op akkoord"}
      >
        {isAkkoord ? (
          <Check className="h-4 w-4 text-success-foreground" strokeWidth={3} />
        ) : (
          <X className="h-4 w-4 text-warning" strokeWidth={3} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground leading-snug mb-1">
          {line.product_naam_herkend}
        </p>

        {/* Loop 4c: besteld-regel — wat er feitelijk besteld is incl. factor.
            Dimmed bij MANUAL_REQUIRED (factor nog niet bevestigd). */}
        {(() => {
          const ctx = line.factor_ctx;
          const aantal = (line.hoeveelheid_ontvangen ?? line.hoeveelheid_verwacht ?? 0) as number;
          const eenheid = line.eenheid_verwacht ?? "";
          const verpakkingLabel = ctx.verpakking_label;
          const factor = ctx.display_factor;
          const factorEenheid = ctx.display_eenheid;
          const baseUnit = ctx.ingredient_base_unit;

          // Per-stuk: base_unit='st' én factor=1 → "{aantal} stuks"
          const isPerStuk =
            baseUnit === "st" && (factor === 1 || factor == null);

          let label: string | null = null;
          if (ctx.mode === "SKIP") {
            label = `${aantal} ${eenheid}`.trim();
          } else if (isPerStuk) {
            label = `${aantal} ${pluralize(eenheid || "stuk", aantal)}`;
          } else if (verpakkingLabel && factor && factorEenheid) {
            label = `${aantal} ${safeVerpakking(verpakkingLabel, aantal)} × ${factor} ${factorEenheid}`;
          } else if (verpakkingLabel) {
            label = `${aantal} ${safeVerpakking(verpakkingLabel, aantal)}`;
          } else {
            label = `${aantal} ${eenheid}`.trim();
          }

          const isUnconfirmed = ctx.mode === "MANUAL_REQUIRED";
          return (
            <p
              className={cn(
                "text-xs tabular-nums mb-1",
                isUnconfirmed ? "text-muted-foreground/70 italic" : "text-muted-foreground",
              )}
            >
              {label}
              {isUnconfirmed && " · factor nog te bevestigen"}
            </p>
          );
        })()}

        <div className="flex items-center gap-2 flex-wrap">
          {line.ai_raw_artikelnummer && (
            <span className="text-xs text-muted-foreground font-mono">
              #{line.ai_raw_artikelnummer}
            </span>
          )}
          {cat === "gekoeld" && (
            <NestoBadge variant="default" size="sm">Gekoeld</NestoBadge>
          )}
          {cat === "vries" && (
            <NestoBadge variant="default" size="sm">Vries</NestoBadge>
          )}
          {isRisk && (
            <NestoBadge variant="warning" size="sm">Risicogroep</NestoBadge>
          )}
        </div>

        {state.kind === "afwijking" && (
          <div
            className="mt-2 flex items-center gap-2 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <NestoBadge variant={accepted ? "success" : "warning"} size="sm">
              {afwijkingLabel}
            </NestoBadge>
            {state.value.afwijking_notitie && (
              <span className="text-xs text-muted-foreground italic line-clamp-1">
                "{state.value.afwijking_notitie}"
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditAfwijking();
              }}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              bewerken
            </button>
          </div>
        )}

        {/* Sprint Pakbon Kok-flow: match-correctie + suggestie-bevestiging */}
        <LineMatchPanel
          line={line}
          receiptId={receiptId}
          leverancierId={leverancierId}
          locationId={locationId}
        />

        {/* Loop 4: inline factor-panel — alleen relevant bij stock-mutatie */}
        <LineFactorPanel
          ctx={line.factor_ctx}
          state={packagingState}
          aantalVerpakkingen={
            (state.kind === "afwijking" && state.value.hoeveelheid_ontvangen != null
              ? state.value.hoeveelheid_ontvangen
              : line.hoeveelheid_ontvangen ?? line.hoeveelheid_verwacht ?? 1) as number
          }
          onChange={onPackagingChange}
          isStockMutation={isStockMutation}
          editingFactor={editingFactor}
          onEditingFactorChange={setEditingFactor}
        />
      </div>
    </div>
  );
}

function TempField({
  label,
  hint,
  value,
  onChange,
  skipped,
  onSkip,
  onClearSkip,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  skipped: string | null;
  onSkip: () => void;
  onClearSkip: () => void;
}) {
  if (skipped) {
    return (
      <div className="space-y-1.5">
        <label className="text-small font-medium text-foreground block">{label}</label>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-warning/40 bg-warning/5 min-h-[60px]">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-small font-medium text-foreground">Overgeslagen</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{skipped}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearSkip}
            className="text-xs text-primary hover:underline whitespace-nowrap"
          >
            Toch meten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-small font-medium text-foreground block">{label}</label>
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{hint}</p>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
        >
          Overslaan
        </button>
      </div>
    </div>
  );
}

export default function LeveringDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, smartFlags } = useGoodsReceiptDetail(id);
  const confirmMutation = useConfirmGoodsReceipt();

  // Default-akkoord state: alle regels vooraf "akkoord". Chef markeert afwijkingen.
  const [lineStates, setLineStates] = React.useState<Map<string, LineState>>(new Map());
  // Loop 4: per-regel packaging-state (factor-actie + variabel gewicht)
  const [packagingStates, setPackagingStates] = React.useState<Map<string, LinePackagingState>>(
    new Map(),
  );
  const [tempGekoeld, setTempGekoeld] = React.useState("");
  const [tempVries, setTempVries] = React.useState("");
  const [skipGekoeld, setSkipGekoeld] = React.useState<string | null>(null);
  const [skipVries, setSkipVries] = React.useState<string | null>(null);

  // Modals
  const [afwijkingFor, setAfwijkingFor] = React.useState<string | null>(null);
  const [skipModalFor, setSkipModalFor] = React.useState<"gekoeld" | "vries" | null>(null);

  React.useEffect(() => {
    if (data?.lines) {
      const next = new Map<string, LineState>();
      const pkg = new Map<string, LinePackagingState>();
      for (const l of data.lines) {
        next.set(l.id, { kind: "akkoord" });
        pkg.set(l.id, { action: { kind: "none" }, werkelijk_gewicht_g: null });
      }
      setLineStates(next);
      setPackagingStates(pkg);
    }
  }, [data?.lines]);

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

  // Loop 4C-FINISH: emballage-regels worden niet meegerekend in counters
  // of voorraad-mutatie. Ze worden wel getoond (gedempt) zodat chef ziet
  // dat ze op de pakbon stonden.
  const stockLines = data.lines.filter((l) => l.factor_ctx.mode !== "SKIP");
  const skipLines = data.lines.filter((l) => l.factor_ctx.mode === "SKIP");
  const totalLines = stockLines.length;
  const akkoord = stockLines.filter(
    (l) => (lineStates.get(l.id) ?? { kind: "akkoord" as const }).kind === "akkoord",
  ).length;
  const afwijking = totalLines - akkoord;

  const editingLine = afwijkingFor ? data.lines.find((l) => l.id === afwijkingFor) : null;
  const editingState = afwijkingFor ? lineStates.get(afwijkingFor) : null;

  // Loop 4: factor-counters per regel — alleen relevant voor stock-mutaties
  const factorBuckets = (() => {
    let confirmed = 0;
    let unconfirmed = 0; // AI_SUGGESTED zonder accept of override
    let manualRequired = 0;
    for (const l of stockLines) {
      const st = lineStates.get(l.id) ?? { kind: "akkoord" as const };
      const pkg = packagingStates.get(l.id) ?? {
        action: { kind: "none" as const },
        werkelijk_gewicht_g: null,
      };
      const isStock =
        st.kind === "akkoord" ||
        (st.kind === "afwijking" && !!st.value.accepted_with_issue);
      if (!isStock) continue;
      const ctx = l.factor_ctx;

      // Variabel gewicht zonder input → manual required
      if (ctx.is_weighted && pkg.werkelijk_gewicht_g == null) {
        manualRequired++;
        continue;
      }

      if (pkg.action.kind === "manual") {
        confirmed++;
        continue;
      }
      if (pkg.action.kind === "accept_ai") {
        confirmed++;
        continue;
      }
      if (ctx.mode === "CONFIRMED") {
        confirmed++;
        continue;
      }
      if (ctx.mode === "AI_SUGGESTED") {
        // Loop 4C: AI_SUGGESTED telt als klaar — bulk-bevestig via hoofdactie
        confirmed++;
        continue;
      }
      manualRequired++;
    }
    return { confirmed, unconfirmed, manualRequired };
  })();

  // Confirm-button state-machine
  const tempGekoeldNum = tempGekoeld === "" ? null : Number(tempGekoeld);
  const tempVriesNum = tempVries === "" ? null : Number(tempVries);
  const tempGekoeldFilled = tempGekoeldNum !== null && !Number.isNaN(tempGekoeldNum);
  const tempVriesFilled = tempVriesNum !== null && !Number.isNaN(tempVriesNum);

  const gekoeldHandled = !smartFlags.hasGekoeld || tempGekoeldFilled || skipGekoeld !== null;
  const vriesHandled = !smartFlags.hasVries || tempVriesFilled || skipVries !== null;
  const risicogroepOK = !smartFlags.hasRisicogroep || tempGekoeldFilled;

  const factorBlocking = factorBuckets.manualRequired > 0;

  const canConfirm =
    totalLines > 0 &&
    gekoeldHandled &&
    vriesHandled &&
    risicogroepOK &&
    !factorBlocking &&
    !confirmMutation.isPending;

  const helperText: string | null = (() => {
    if (confirmMutation.isPending) return null;
    if (factorBlocking)
      return `${factorBuckets.manualRequired} regel(s) vragen om jouw input vóór bevestigen`;
    if (!risicogroepOK) return "Temperatuur verplicht voor risicogroep-producten — overslaan kan niet";
    if (!gekoeldHandled) return "Vul temperatuur gekoeld in of kies 'Overslaan'";
    if (!vriesHandled) return "Vul temperatuur vries in of kies 'Overslaan'";
    return null;
  })();

  const handleMarkAfwijking = (lineId: string) => setAfwijkingFor(lineId);
  const handleResetAkkoord = (lineId: string) => {
    setLineStates((prev) => {
      const next = new Map(prev);
      next.set(lineId, { kind: "akkoord" });
      return next;
    });
  };

  const handlePackagingChange = (lineId: string, next: LinePackagingState) => {
    setPackagingStates((prev) => {
      const m = new Map(prev);
      m.set(lineId, next);
      return m;
    });
  };

  const handleAfwijkingSubmit = (value: AfwijkingValue) => {
    if (!afwijkingFor) return;
    setLineStates((prev) => {
      const next = new Map(prev);
      next.set(afwijkingFor, { kind: "afwijking", value });
      return next;
    });
    setAfwijkingFor(null);
  };

  const handleConfirm = () => {
    if (!id) return;
    // Loop 4C-FINISH: emballage-regels worden NIET doorgestuurd naar de
    // confirm-edge (geen voorraad-mutatie, geen klacht).
    const lines: ConfirmLineInput[] = data.lines
      .filter((l) => l.factor_ctx.mode !== "SKIP")
      .map((l) => {
      const st = lineStates.get(l.id);
      const pkg = packagingStates.get(l.id) ?? {
        action: { kind: "none" as const },
        werkelijk_gewicht_g: null,
      };
      const factorPayload: Partial<ConfirmLineInput> = {};
      if (pkg.action.kind === "accept_ai") factorPayload.accept_ai_factor = true;
      if (pkg.action.kind === "manual")
        factorPayload.manual_factor = {
          hoeveelheid: pkg.action.hoeveelheid,
          eenheid: pkg.action.eenheid,
        };
      // Loop 4C: bulk-bevestig — AI_SUGGESTED zonder expliciete chef-actie
      // wordt impliciet bevestigd via "Bevestig levering" (één tap = klaar).
      if (
        pkg.action.kind === "none" &&
        l.factor_ctx.mode === "AI_SUGGESTED"
      ) {
        factorPayload.accept_ai_factor = true;
      }
      if (l.factor_ctx.is_weighted && pkg.werkelijk_gewicht_g != null)
        factorPayload.werkelijk_gewicht_g = pkg.werkelijk_gewicht_g;

      if (!st || st.kind === "akkoord") {
        return { line_id: l.id, status: "akkoord", ...factorPayload };
      }
      const v = st.value;
      return {
        line_id: l.id,
        status: v.status,
        hoeveelheid_ontvangen: v.hoeveelheid_ontvangen,
        afwijking_notitie: v.afwijking_notitie,
        accepted_with_issue: v.accepted_with_issue,
        ...factorPayload,
      };
    });

    const tempSkip: { gekoeld?: string; vries?: string } = {};
    if (skipGekoeld) tempSkip.gekoeld = skipGekoeld;
    if (skipVries) tempSkip.vries = skipVries;

    confirmMutation.mutate(
      {
        receipt_id: id,
        lines,
        temp_gekoeld: tempGekoeldFilled ? tempGekoeldNum : null,
        temp_vries: tempVriesFilled ? tempVriesNum : null,
        temp_skip: tempSkip,
      },
      {
        onSuccess: (res) => {
          const s = res.summary;
          const desc =
            s.count_afwijking > 0
              ? `${s.count_akkoord} akkoord, ${s.count_afwijking} afwijking — ${s.credit_notes_created} klacht aangemaakt`
              : `${s.count_akkoord} regels op voorraad`;
          if (s.has_strict_temp_alarm) {
            nestoToast.warning("Levering bevestigd · temp-alarm", desc);
          } else {
            nestoToast.success("Levering bevestigd", desc);
          }
          navigate("/leveringen");
        },
        onError: (err: ConfirmError) => {
          if (err.code === "factor_required" && err.details?.lines?.length) {
            const items = err.details.lines;
            const first = items[0];
            const more = items.length > 1 ? ` (+${items.length - 1} meer)` : "";
            nestoToast.error(
              "Verpakking-info nodig",
              `${first.product ?? "Regel"}: ${first.reason}${more}`,
            );
            return;
          }
          const map: Record<string, { title: string; desc?: string }> = {
            forbidden: { title: "Geen permissie", desc: "Je hebt geen rechten om deze levering te bevestigen." },
            already_confirmed: { title: "Al bevestigd", desc: "Deze pakbon is al verwerkt of geannuleerd." },
            receipt_not_found: { title: "Pakbon niet gevonden" },
            validation_error: { title: "Invoer ongeldig", desc: err.message },
            unauthorized: { title: "Niet ingelogd", desc: "Log opnieuw in." },
            internal_error: { title: "Server-fout", desc: err.message },
            network_error: { title: "Verbindingsfout", desc: "Controleer je internet." },
            unit_mismatch: { title: "Eenheid-mismatch", desc: err.message },
          };
          const m = map[err.code] ?? { title: "Onbekende fout", desc: err.message };
          nestoToast.error(m.title, m.desc);
        },
      },
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <DetailPageLayout
        title={data.leverancier?.naam ?? "Levering"}
        backHref="/leveringen"
      >
        {/* Leverancier-warning: bewust verborgen voor chef-flow.
            Data + audit-trail blijven in DB (leverancier_warning,
            leverancier_warning_reason) voor toekomstig manager-dashboard. */}

        {/* Pakbon meta */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small">
            {data.pakbon_nummer && (
              <div>
                <span className="text-muted-foreground">Pakbon</span>{" "}
                <span className="font-mono text-foreground">#{data.pakbon_nummer}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Datum</span>{" "}
              <span className="text-foreground font-medium">
                {formatLeveringDatumDetail(data.levering_datum)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Regels</span>{" "}
              <span className="text-foreground font-medium">{totalLines}</span>
              {skipLines.length > 0 && (
                <span className="text-muted-foreground/70">
                  {" "}(+{skipLines.length} emballage)
                </span>
              )}
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
          <div className="flex items-center mb-3">
            <h2 className="text-h3 text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Regels
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Info over regels"
                      className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    Alles staat standaard akkoord. Tik op een regel om een afwijking te markeren.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h2>
          </div>

          {/* Loop 4c: stock-regels eerst, daarna emballage onder een sectie-header. */}
          <div className="space-y-2">
            {stockLines.map((line) => {
              const state = lineStates.get(line.id) ?? { kind: "akkoord" as const };
              const pkg =
                packagingStates.get(line.id) ?? {
                  action: { kind: "none" as const },
                  werkelijk_gewicht_g: null,
                };
              return (
                <LineRow
                  key={line.id}
                  id={`line-${line.id}`}
                  line={line}
                  state={state}
                  packagingState={pkg}
                  onPackagingChange={(next) => handlePackagingChange(line.id, next)}
                  onMarkAfwijking={() => handleMarkAfwijking(line.id)}
                  onResetAkkoord={() => handleResetAkkoord(line.id)}
                  onEditAfwijking={() => handleMarkAfwijking(line.id)}
                  receiptId={data.id}
                  leverancierId={data.leverancier_id}
                  locationId={data.location_id}
                />
              );
            })}
          </div>

          {skipLines.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Niet meegerekend ({skipLines.length})
              </h3>
              <div className="space-y-2">
                {skipLines.map((line) => (
                  <div
                    key={line.id}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20 opacity-60"
                  >
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-small text-muted-foreground line-clamp-1">
                        {line.product_naam_herkend}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        emballage — niet meegerekend
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Temperatuur-secties */}
        {(smartFlags.hasGekoeld || smartFlags.hasVries || smartFlags.hasRisicogroep) && (
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
                  onChange={(v) => {
                    setTempGekoeld(v);
                    if (v !== "") setSkipGekoeld(null);
                  }}
                  skipped={skipGekoeld}
                  onSkip={() => {
                    if (smartFlags.hasRisicogroep) {
                      nestoToast.warning(
                        "Overslaan niet toegestaan",
                        "Risicogroep-producten vereisen een temperatuur-meting."
                      );
                      return;
                    }
                    setSkipModalFor("gekoeld");
                  }}
                  onClearSkip={() => setSkipGekoeld(null)}
                />
              )}
              {smartFlags.hasVries && (
                <TempField
                  label="Vries (max -18 °C)"
                  hint="Meet de oppervlakte-temperatuur van een diepvriesproduct."
                  value={tempVries}
                  onChange={(v) => {
                    setTempVries(v);
                    if (v !== "") setSkipVries(null);
                  }}
                  skipped={skipVries}
                  onSkip={() => setSkipModalFor("vries")}
                  onClearSkip={() => setSkipVries(null)}
                />
              )}
              {smartFlags.hasRisicogroep && (
                <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-4">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-small">
                    <p className="font-medium text-foreground">
                      Risicogroep aanwezig
                      {smartFlags.strictTempMax !== null && (
                        <>
                          {" — "}max{" "}
                          <span className="font-semibold">{smartFlags.strictTempMax} °C</span>
                        </>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Vlees, vis of zuivel met strikte eis. Meting verplicht.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Loop 4c-finalize: inline confirm-card als laatste sectie */}
        <LeveringConfirmCard
          state={
            factorBlocking
              ? "wacht"
              : totalLines > 0 && akkoord === 0
              ? "alles_afwijking"
              : "klaar"
          }
          totalLines={totalLines}
          akkoord={akkoord}
          afwijking={afwijking}
          manualRequired={factorBuckets.manualRequired}
          helperText={helperText}
          isPending={confirmMutation.isPending}
          isDisabled={!canConfirm}
          onConfirm={handleConfirm}
          onJumpToFirstOpen={() => {
            const first = stockLines.find((l) => {
              const st = lineStates.get(l.id) ?? { kind: "akkoord" as const };
              const pkg = packagingStates.get(l.id);
              const isStock =
                st.kind === "akkoord" ||
                (st.kind === "afwijking" && !!st.value.accepted_with_issue);
              if (!isStock) return false;
              if (l.factor_ctx.is_weighted && (!pkg || pkg.werkelijk_gewicht_g == null)) return true;
              if (l.factor_ctx.mode === "MANUAL_REQUIRED" && (!pkg || pkg.action.kind === "none")) return true;
              return false;
            });
            if (first) {
              const el = document.getElementById(`line-${first.id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
        />
      </DetailPageLayout>

      {/* Afwijking modal */}
      {editingLine && (
        <AfwijkingModal
          open={!!afwijkingFor}
          onOpenChange={(o) => !o && setAfwijkingFor(null)}
          productNaam={editingLine.product_naam_herkend}
          hoeveelheidVerwacht={editingLine.hoeveelheid_verwacht}
          eenheid={editingLine.eenheid_verwacht}
          initial={editingState?.kind === "afwijking" ? editingState.value : null}
          onSubmit={handleAfwijkingSubmit}
        />
      )}

      {/* Skip-temp modal */}
      {skipModalFor && (
        <SkipTempModal
          open={!!skipModalFor}
          onOpenChange={(o) => !o && setSkipModalFor(null)}
          type={skipModalFor}
          onConfirm={(reden) => {
            if (skipModalFor === "gekoeld") {
              setSkipGekoeld(reden);
              setTempGekoeld("");
            } else {
              setSkipVries(reden);
              setTempVries("");
            }
          }}
        />
      )}
    </div>
  );
}
