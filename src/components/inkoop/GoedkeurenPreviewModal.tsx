/**
 * GoedkeurenPreviewModal — D.6b R4b-2
 *
 * Toont impact-samenvatting voordat factuur wordt goedgekeurd.
 * Verplichte checkbox bij grote prijswijzigingen (>25%).
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
  Sparkles,
  TrendingUp,
  TrendingDown,
  Link2,
  SkipForward,
  Package,
} from "lucide-react";
import {
  usePreviewGoedkeuring,
  type PreviewData,
  type PrijsWijziging,
} from "@/hooks/usePreviewGoedkeuring";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (snapshot: PreviewData) => void;
  isConfirming: boolean;
  factuur: {
    factuurnummer: string | null;
    leverancierNaam: string | null;
    totaal: number;
    regels: FactuurRegel[];
  } | null;
}

const fmtEuro = (n: number | null) =>
  n == null
    ? "—"
    : `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtEuroPrecise = (n: number | null) =>
  n == null
    ? "—"
    : `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

const fmtPct = (n: number) => {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
};

function PrijsRij({ w }: { w: PrijsWijziging }) {
  const isGroot = w.severity === "groot";
  const isMiddel = w.severity === "middel";
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
              Grote wijziging
            </NestoBadge>
          )}
          {isMiddel && (
            <NestoBadge variant="default" size="sm">
              wijziging
            </NestoBadge>
          )}
          <span
            className={`text-xs font-medium tabular-nums inline-flex items-center gap-0.5 ${
              isGroot
                ? "text-warning-foreground"
                : isStijging
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {fmtPct(w.deltaPct)}
          </span>
        </div>
      )}
      {w.oudePrijs == null && (
        <NestoBadge variant="default" size="sm">
          eerste prijs
        </NestoBadge>
      )}
    </div>
  );
}

function Sectie({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold">
          {title} <span className="text-muted-foreground">({count})</span>
        </h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

export function GoedkeurenPreviewModal({
  open,
  onClose,
  onConfirm,
  isConfirming,
  factuur,
}: Props) {
  const { data: preview, isLoading } = usePreviewGoedkeuring(open, factuur);
  const [acked, setAcked] = React.useState(false);

  React.useEffect(() => {
    if (!open) setAcked(false);
  }, [open]);

  const heeftGroot = preview?.heeftGroteWijzigingen ?? false;
  const canConfirm = !isLoading && !!preview && (!heeftGroot || acked);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isConfirming && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            Factuur goedkeuren — wat gaat er gebeuren?
          </DialogTitle>
          {preview && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {preview.factuur.leverancierNaam ?? "Onbekende leverancier"}
              {preview.factuur.factuurnummer
                ? ` · #${preview.factuur.factuurnummer}`
                : ""}
              {" · "}
              <span className="tabular-nums">{fmtEuro(preview.factuur.totaal)}</span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-5">
          {isLoading || !preview ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <Sectie
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                title="Nieuwe ingrediënten"
                count={preview.nieuweIngredienten.length}
              >
                {preview.nieuweIngredienten.map((n) => (
                  <div
                    key={n.regelId}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.naam}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.eenheid ?? "—"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {fmtEuroPrecise(n.prijs)} / {n.eenheid ?? "eh"}
                    </span>
                  </div>
                ))}
              </Sectie>

              <Sectie
                icon={
                  heeftGroot ? (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-foreground" />
                  )
                }
                title="Kostprijs-wijzigingen"
                count={preview.kostprijsWijzigingen.length}
              >
                {preview.kostprijsWijzigingen.map((w) => (
                  <PrijsRij key={w.ingredientId} w={w} />
                ))}
              </Sectie>

              {preview.nieuweKoppelingen > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-foreground" />
                    <h3 className="text-sm font-semibold">
                      Leveranciers-koppelingen{" "}
                      <span className="text-muted-foreground">
                        ({preview.nieuweKoppelingen})
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground px-3">
                    Artikelnummers worden bij de leverancier gekoppeld zodat de
                    volgende factuur direct auto-matcht.
                  </p>
                </section>
              )}

              <Sectie
                icon={<SkipForward className="h-4 w-4 text-muted-foreground" />}
                title="Overgeslagen regels"
                count={preview.skippedRegels.length}
              >
                {preview.skippedRegels.map((s) => (
                  <div
                    key={s.regelId}
                    className="px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    {s.naam}
                  </div>
                ))}
              </Sectie>

              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40">
                <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Voorraad wordt <strong>niet</strong> bijgeschreven via deze
                  factuur. Gebruik pakbon-ontvangst om voorraad te corrigeren.
                </p>
              </div>

              {heeftGroot && (
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
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4">
          <NestoButton variant="outline" onClick={onClose} disabled={isConfirming}>
            Annuleren
          </NestoButton>
          <NestoButton
            variant="primary"
            onClick={() => preview && onConfirm(preview)}
            disabled={!canConfirm}
            isLoading={isConfirming}
          >
            Bevestig & goedkeuren
          </NestoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
