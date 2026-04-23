/**
 * Sprint Factuur Enterprise Pass — ProcessFactuurModal (vereenvoudigd)
 *
 * Drie stappen:
 *   1) PREVIEW   — max 4 regels samenvatting; alleen prijswijzigingen >25% tonen
 *   2) PROCESSING — één spinner-regel, geen Fase 1/2/3 progress
 *   3) RESULT    — succes (CheckCircle2 + terug-knop) OF partial-fail tabel + retry
 *
 * Sum-mismatch (<€2): info-regel onderaan, geen blokkerende checkbox.
 * Sum-mismatch (>€2): backend zet status=review_blocked → modal opent niet eens
 *                     (de banner vervangt de Verwerk-knop).
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { NestoButton, Spinner } from "@/components/polar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  usePreviewGoedkeuring,
  type PrijsWijziging,
} from "@/hooks/usePreviewGoedkeuring";
import {
  useProcessFactuur,
  sumCheck,
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
// Sub-component: prijswijziging-rij (alleen >25%)
// ============================================================
function PrijsRij({ w }: { w: PrijsWijziging }) {
  const isStijging = w.deltaPct > 0;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30">
      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
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
      <span
        className={`text-xs font-semibold tabular-nums shrink-0 ${
          isStijging ? "text-warning" : "text-success"
        }`}
      >
        {fmtPct(w.deltaPct)}
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

  const sc = sumCheck(factuur);
  const heeftGroteWijziging = preview?.heeftGroteWijzigingen ?? false;

  // Sum-mismatch klein (<€2): alleen info, geen block.
  const sumMismatchKlein = !sc.matches && sc.ai != null && sc.delta < 2;
  // Sum-mismatch groot zou backend al hebben geblokkeerd → factuur.status='review_blocked'
  // en modal opent dan niet (page rendert FactuurBlockedBanner ipv Verwerk-knop).

  React.useEffect(() => {
    if (!open) {
      setAcked(false);
      reset();
    }
  }, [open, reset]);

  const canRun =
    !!preview && !isRunning && (!heeftGroteWijziging || acked);

  const handleRun = async () => {
    if (!factuur) return;
    await run(factuurId, factuur);
  };

  const handleRetry = async () => {
    if (!factuur) return;
    setAcked(true);
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

  // Filter: alleen >25% prijswijzigingen tonen.
  const groteWijzigingen = (preview?.kostprijsWijzigingen ?? []).filter(
    (w) => Math.abs(w.deltaPct) >= 25
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isRunning && handleClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">
            {isPreviewStep && "Verwerk factuur"}
            {isProcessingStep && "Even geduld..."}
            {phase === "done" && "Factuur goedgekeurd"}
            {phase === "partial" && "Verwerking deels gelukt"}
            {phase === "error" && "Verwerking mislukt"}
          </DialogTitle>
          {factuur && isPreviewStep && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {factuur.leverancier_naam ?? "Onbekende leverancier"}
              {factuur.factuurnummer ? ` · #${factuur.factuurnummer}` : ""}
              {" · "}
              <span className="tabular-nums">{fmtEuro(totaal)}</span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
          {/* ============ PREVIEW STEP ============ */}
          {isPreviewStep && (
            <>
              {previewLoading || !preview ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <>
                  {/* Beknopte samenvatting — max 4 regels tekst */}
                  <ul className="space-y-1.5 text-sm">
                    {preview.bijwerkenIngredienten.length > 0 && (
                      <li className="flex items-baseline gap-2">
                        <span className="text-muted-foreground tabular-nums w-6 text-right">
                          {preview.bijwerkenIngredienten.length}
                        </span>
                        <span>prijzen worden bijgewerkt</span>
                      </li>
                    )}
                    {preview.nieuweIngredienten.length > 0 && (
                      <li className="flex items-baseline gap-2">
                        <span className="text-muted-foreground tabular-nums w-6 text-right">
                          {preview.nieuweIngredienten.length}
                        </span>
                        <span>nieuwe ingrediënten worden aangemaakt</span>
                      </li>
                    )}
                    {preview.verpakkingRegels.length > 0 && (
                      <li className="flex items-baseline gap-2">
                        <span className="text-muted-foreground tabular-nums w-6 text-right">
                          {preview.verpakkingRegels.length}
                        </span>
                        <span>verpakkingen worden overgeslagen</span>
                      </li>
                    )}
                    {preview.bijwerkenIngredienten.length === 0 &&
                      preview.nieuweIngredienten.length === 0 &&
                      preview.verpakkingRegels.length === 0 && (
                        <li className="text-muted-foreground italic">
                          Niets te verwerken op deze factuur.
                        </li>
                      )}
                  </ul>

                  {/* Grote prijswijzigingen (>25%) */}
                  {groteWijzigingen.length > 0 && (
                    <section className="space-y-2 pt-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Grote prijswijzigingen ({groteWijzigingen.length})
                      </h3>
                      <div className="space-y-1.5">
                        {groteWijzigingen.map((w, idx) => (
                          <PrijsRij key={`${w.ingredientId}-${idx}`} w={w} />
                        ))}
                      </div>
                      <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/30 cursor-pointer">
                        <Checkbox
                          checked={acked}
                          onCheckedChange={(v) => setAcked(v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-foreground">
                          Ik heb de wijzigingen gecontroleerd en wil doorgaan.
                        </span>
                      </label>
                    </section>
                  )}

                  {/* Sum-mismatch klein — info, geen block */}
                  {sumMismatchKlein && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Klein verschil: som regels ({fmtEuro(sc.berekend)}) vs
                      factuur-totaal ({fmtEuro(sc.ai!)}) — {fmtEuro(sc.delta)}.
                      Acceptabel.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ============ PROCESSING STEP ============ */}
          {isProcessingStep && (
            <div className="flex flex-col items-center text-center py-10 space-y-3">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Factuur wordt verwerkt...
              </p>
            </div>
          )}

          {/* ============ RESULT STEP ============ */}
          {isResultStep && result && (
            <>
              {phase === "done" && (
                <div className="flex flex-col items-center text-center py-8 space-y-3">
                  <div className="h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">
                      Factuur goedgekeurd
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.totalSucceeded} regels verwerkt · kostprijzen
                      bijgewerkt
                    </p>
                  </div>
                </div>
              )}

              {phase === "partial" && (
                <>
                  <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-warning/10 border border-warning/30">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {result.totalSucceeded} van{" "}
                        {result.totalSucceeded + result.totalFailures} regels
                        verwerkt
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Los de probleem-regels op en probeer opnieuw.
                      </p>
                    </div>
                  </div>

                  <section className="space-y-1.5">
                    {[
                      ...result.phaseA.failures,
                      ...result.phaseB.failures,
                      ...result.phaseC.failures,
                    ].map((f) => (
                      <FailureRow key={f.regelId} f={f} />
                    ))}
                  </section>
                </>
              )}

              {phase === "error" && (
                <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Finalisatie mislukt</p>
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

          {(phase === "partial" || phase === "error") && (
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
