/**
 * Sprint C1 — ProcessFactuurModal
 *
 * Eén-klik "Verwerk factuur" flow met 3 stappen:
 *   1) PREVIEW — toont samenvatting + sum-check + grote-prijswijziging gate
 *   2) PROCESSING — toont per-fase progress (1/3, 2/3, 3/3, finalisatie)
 *   3) RESULT — succes-banner OF chef-vriendelijke fout-tabel met retry
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { NestoButton, NestoBadge, Spinner } from "@/components/polar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Package,
  ChevronDown,
  ChevronRight,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  usePreviewGoedkeuring,
  type PreviewData,
  type PrijsWijziging,
} from "@/hooks/usePreviewGoedkeuring";
import {
  useProcessFactuur,
  sumCheck,
  type ProcessPhase,
  type PhaseFailure,
} from "@/hooks/useProcessFactuur";
import type { FactuurDetail } from "@/hooks/useFactuurDetail";
import { fmtEuro, fmtEuroPrecise } from "@/lib/format";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  factuur: FactuurDetail | null;
  factuurId: string;
}

const fmtPct = (n: number) => {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
};

// ============================================================
// Sub-component: prijswijziging-rij
// ============================================================
function PrijsRij({ w }: { w: PrijsWijziging }) {
  const isGroot = w.severity === "groot";
  const isStijging = w.deltaPct > 0;
  const Icon = isStijging ? TrendingUp : TrendingDown;
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
        isGroot
          ? "bg-warning/10 border border-warning/30"
          : "bg-muted/30 border border-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{w.ingredientNaam}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {w.oudePrijs == null ? (
            <>nieuw → {fmtEuroPrecise(w.nieuwePrijs)}</>
          ) : (
            <>
              {fmtEuroPrecise(w.oudePrijs)} → {fmtEuroPrecise(w.nieuwePrijs)}
            </>
          )}
        </p>
      </div>
      {w.oudePrijs != null && (
        <div className="flex items-center gap-1.5 shrink-0">
          {isGroot && (
            <NestoBadge variant="warning" size="sm">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Groot
            </NestoBadge>
          )}
          <span
            className={`text-xs font-medium tabular-nums inline-flex items-center gap-0.5 ${
              isGroot ? "text-warning-foreground" : "text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {fmtPct(w.deltaPct)}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-component: per-fase progress regel
// ============================================================
interface PhaseRowProps {
  step: number;
  label: string;
  count: number;
  state: "wait" | "active" | "done" | "skip";
}
function PhaseRow({ step, label, count, state }: PhaseRowProps) {
  const Icon =
    state === "active"
      ? Loader2
      : state === "done"
      ? CheckCircle2
      : state === "skip"
      ? CheckCircle2
      : ChevronRight;
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
        state === "active"
          ? "border-primary/40 bg-primary/5"
          : state === "done" || state === "skip"
          ? "border-border/30 bg-muted/30 opacity-80"
          : "border-border/30 bg-muted/10 opacity-50"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          state === "active"
            ? "text-primary animate-spin"
            : state === "done"
            ? "text-success"
            : state === "skip"
            ? "text-muted-foreground"
            : "text-muted-foreground"
        }`}
      />
      <div className="flex-1 text-sm">
        <span className="text-muted-foreground tabular-nums">Fase {step}/3 — </span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {count > 0 ? `${count}` : "—"}
      </span>
    </div>
  );
}

// ============================================================
// Sub-component: fout-rij met expandable detail
// ============================================================
function FailureRow({ f }: { f: PhaseFailure }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1">
      <div className="flex items-start gap-2">
        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{f.productNaam}</p>
          <p className="text-xs text-muted-foreground">{f.reden}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 ml-6"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        Meer info
      </button>
      {open && (
        <pre className="ml-6 text-[10px] text-muted-foreground bg-muted/40 p-2 rounded overflow-x-auto">
          {f.technisch}
        </pre>
      )}
    </div>
  );
}

// ============================================================
// Hoofd-component
// ============================================================
export function ProcessFactuurModal({ open, onClose, factuur, factuurId }: Props) {
  const navigate = useNavigate();
  const { data: preview, isLoading: previewLoading } = usePreviewGoedkeuring(
    open,
    factuur
      ? {
          factuurnummer: factuur.factuurnummer,
          leverancierNaam: factuur.leverancier_naam ?? null,
          totaal: (factuur.regels ?? []).reduce((s, r) => s + (r.totaal ?? 0), 0),
          regels: factuur.regels,
        }
      : null
  );
  const { phase, result, isRunning, run, reset } = useProcessFactuur();

  const [acked, setAcked] = React.useState(false);
  const [sumAcked, setSumAcked] = React.useState(false);

  const sc = sumCheck(factuur);
  const heeftGroteWijziging = preview?.heeftGroteWijzigingen ?? false;
  const sumMismatch = !sc.matches && sc.ai != null;

  React.useEffect(() => {
    if (!open) {
      setAcked(false);
      setSumAcked(false);
      reset();
    }
  }, [open, reset]);

  const canRun =
    !!preview &&
    !isRunning &&
    (!heeftGroteWijziging || acked) &&
    (!sumMismatch || sumAcked);

  const handleRun = async () => {
    if (!factuur) return;
    await run(factuurId, factuur);
  };

  const handleRetry = async () => {
    if (!factuur) return;
    // Idempotent: re-fetch via cache invalidation gebeurt al; we draaien opnieuw.
    // partitionRegels filtert op huidige status, dus al-verwerkte regels worden geskipt.
    setAcked(true);
    setSumAcked(true);
    await run(factuurId, factuur);
  };

  const handleClose = () => {
    if (phase === "done") navigate("/inkoop");
    onClose();
  };

  const totaal = factuur ? (factuur.regels ?? []).reduce((s, r) => s + (r.totaal ?? 0), 0) : 0;

  const isPreviewStep = phase === "idle";
  const isProcessingStep = phase === "A" || phase === "B" || phase === "C" || phase === "D";
  const isResultStep = phase === "done" || phase === "partial" || phase === "error";

  // Phase-state helper
  const phaseState = (target: "A" | "B" | "C"): PhaseRowProps["state"] => {
    const order: ProcessPhase[] = ["A", "B", "C", "D", "done", "partial", "error"];
    const currentIdx = order.indexOf(phase);
    const targetIdx = order.indexOf(target);
    if (phase === "idle") return "wait";
    if (target === phase) return "active";
    if (currentIdx > targetIdx) return "done";
    return "wait";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isRunning && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">
            {isPreviewStep && "Factuur verwerken — wat gaat er gebeuren?"}
            {isProcessingStep && "Factuur wordt verwerkt..."}
            {phase === "done" && "Factuur goedgekeurd ✓"}
            {phase === "partial" && "Verwerking deels gelukt"}
            {phase === "error" && "Verwerking mislukt"}
          </DialogTitle>
          {factuur && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {factuur.leverancier_naam ?? "Onbekende leverancier"}
              {factuur.factuurnummer ? ` · #${factuur.factuurnummer}` : ""}
              {" · "}
              <span className="tabular-nums">{fmtEuro(totaal)}</span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-5">
          {/* ============ PREVIEW STEP ============ */}
          {isPreviewStep && (
            <>
              {previewLoading || !preview ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <>
                  {/* Sum-check banner */}
                  {sumMismatch && (
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/30">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-medium text-foreground">
                          Som regels ({fmtEuro(sc.berekend)}) wijkt af van
                          factuur-totaal ({fmtEuro(sc.ai)}).
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          Verschil: {fmtEuro(sc.delta)} ({sc.deltaPct.toFixed(1)}%).
                          Controleer of je geen regels mist of dubbel hebt.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Korte samenvatting */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-lg font-semibold tabular-nums">
                        {preview.bijwerkenIngredienten.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Bijwerken</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-lg font-semibold tabular-nums">
                        {preview.nieuweIngredienten.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Nieuw aanmaken</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-lg font-semibold tabular-nums">
                        {preview.verpakkingRegels.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Verpakking</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-lg font-semibold tabular-nums">
                        {preview.kostprijsWijzigingen.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Prijswijz.</p>
                    </div>
                  </div>

                  {/* Nieuwe ingrediënten */}
                  {preview.nieuweIngredienten.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">
                          Nieuwe ingrediënten aanmaken{" "}
                          <span className="text-muted-foreground">
                            ({preview.nieuweIngredienten.length})
                          </span>
                        </h3>
                      </div>
                      <div className="space-y-1.5">
                        {preview.nieuweIngredienten.slice(0, 5).map((n, idx) => (
                          <div
                            key={`${n.regelId}-${idx}`}
                            className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/30 text-sm"
                          >
                            <span className="flex-1 min-w-0 truncate">{n.naam}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {fmtEuroPrecise(n.prijs)} / {n.eenheid ?? "eh"}
                            </span>
                          </div>
                        ))}
                        {preview.nieuweIngredienten.length > 5 && (
                          <p className="text-xs text-muted-foreground px-3">
                            … en nog {preview.nieuweIngredienten.length - 5} meer
                          </p>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Kostprijs-wijzigingen */}
                  {preview.kostprijsWijzigingen.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        {heeftGroteWijziging ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-foreground" />
                        )}
                        <h3 className="text-sm font-semibold">
                          Kostprijs-wijzigingen{" "}
                          <span className="text-muted-foreground">
                            ({preview.kostprijsWijzigingen.length})
                          </span>
                        </h3>
                      </div>
                      <div className="space-y-1.5">
                        {preview.kostprijsWijzigingen.map((w, idx) => (
                          <PrijsRij key={`${w.ingredientId}-${idx}`} w={w} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Verpakking */}
                  {preview.verpakkingRegels.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">
                          Verpakking & toeslagen{" "}
                          <span className="text-muted-foreground">
                            ({preview.verpakkingRegels.length})
                          </span>
                        </h3>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {fmtEuro(preview.verpakkingTotaal)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground px-3">
                        Worden overgeslagen — geen ingrediënt-koppeling.
                      </p>
                    </section>
                  )}

                  {/* Acceptatie checkbox: grote prijswijziging */}
                  {heeftGroteWijziging && (
                    <label className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-warning/10 border border-warning/30 cursor-pointer">
                      <Checkbox
                        checked={acked}
                        onCheckedChange={(v) => setAcked(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-foreground">
                        Ik heb de grote prijswijzigingen gecontroleerd en wil doorgaan.
                      </span>
                    </label>
                  )}

                  {/* Acceptatie checkbox: som-mismatch */}
                  {sumMismatch && (
                    <label className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-warning/10 border border-warning/30 cursor-pointer">
                      <Checkbox
                        checked={sumAcked}
                        onCheckedChange={(v) => setSumAcked(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-foreground">
                        Ik heb het verschil tussen som-regels en factuur-totaal
                        gecontroleerd en wil doorgaan.
                      </span>
                    </label>
                  )}
                </>
              )}
            </>
          )}

          {/* ============ PROCESSING STEP ============ */}
          {isProcessingStep && preview && (
            <div className="space-y-3 py-4">
              <PhaseRow
                step={1}
                label="Bestaande matches bevestigen"
                count={preview.bijwerkenIngredienten.length}
                state={phaseState("A")}
              />
              <PhaseRow
                step={2}
                label="Nieuwe ingrediënten aanmaken"
                count={preview.nieuweIngredienten.length}
                state={phaseState("B")}
              />
              <PhaseRow
                step={3}
                label="Verpakking & toeslagen overslaan"
                count={preview.verpakkingRegels.length}
                state={phaseState("C")}
              />
              {phase === "D" && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary/40 bg-primary/5">
                  <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                  <p className="text-sm font-medium">
                    Factuur afronden — kostprijzen bijwerken & leveranciers koppelen
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============ RESULT STEP ============ */}
          {isResultStep && result && (
            <>
              {/* Succes */}
              {phase === "done" && (
                <div className="flex flex-col items-center text-center py-8 space-y-3">
                  <div className="h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Factuur goedgekeurd</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.totalSucceeded} regels verwerkt · kostprijzen bijgewerkt ·
                      leveranciers gekoppeld
                    </p>
                  </div>
                </div>
              )}

              {/* Partial */}
              {phase === "partial" && (
                <>
                  <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-warning/10 border border-warning/30">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {result.totalSucceeded} van{" "}
                        {result.totalSucceeded + result.totalFailures} regels verwerkt
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.totalFailures} regel(s) hebben aandacht nodig. Factuur
                        blijft op "review" — los de problemen op en probeer opnieuw.
                      </p>
                    </div>
                  </div>

                  {/* Per-fase samenvatting */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/30 p-2">
                      <p className="font-semibold tabular-nums">
                        {result.phaseA.succeeded}/{result.phaseA.attempted}
                      </p>
                      <p className="text-muted-foreground">Bijgewerkt</p>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2">
                      <p className="font-semibold tabular-nums">
                        {result.phaseB.succeeded}/{result.phaseB.attempted}
                      </p>
                      <p className="text-muted-foreground">Aangemaakt</p>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2">
                      <p className="font-semibold tabular-nums">
                        {result.phaseC.succeeded}/{result.phaseC.attempted}
                      </p>
                      <p className="text-muted-foreground">Overgeslagen</p>
                    </div>
                  </div>

                  {/* Fout-tabel */}
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">Probleemregels</h3>
                    <div className="space-y-1.5">
                      {[
                        ...result.phaseA.failures,
                        ...result.phaseB.failures,
                        ...result.phaseC.failures,
                      ].map((f) => (
                        <FailureRow key={f.regelId} f={f} />
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Error in Phase D */}
              {phase === "error" && (
                <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      Finalisatie mislukt
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Regels zijn verwerkt, maar de factuur kon niet op
                      "goedgekeurd" gezet worden. Probeer opnieuw.
                    </p>
                    {result.phaseDError && (
                      <pre className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded mt-2 overflow-x-auto">
                        {result.phaseDError}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4">
          {isPreviewStep && (
            <>
              <NestoButton variant="outline" onClick={onClose}>
                Annuleren
              </NestoButton>
              <NestoButton
                variant="primary"
                onClick={handleRun}
                disabled={!canRun}
              >
                Verwerk factuur ({fmtEuro(totaal)})
              </NestoButton>
            </>
          )}

          {isProcessingStep && (
            <NestoButton variant="outline" disabled>
              Even geduld...
            </NestoButton>
          )}

          {phase === "done" && (
            <NestoButton variant="primary" onClick={handleClose}>
              Terug naar facturen
            </NestoButton>
          )}

          {phase === "partial" && (
            <>
              <NestoButton variant="outline" onClick={onClose}>
                Sluiten
              </NestoButton>
              <NestoButton variant="primary" onClick={handleRetry}>
                Probeer opnieuw
              </NestoButton>
            </>
          )}

          {phase === "error" && (
            <>
              <NestoButton variant="outline" onClick={onClose}>
                Sluiten
              </NestoButton>
              <NestoButton variant="primary" onClick={handleRetry}>
                Probeer opnieuw
              </NestoButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
