import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  NestoButton,
  NestoSelect,
  NestoBadge,
  Spinner,
  NestoDatePicker,
  dateFromString,
  dateToString,
} from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useFactuurDetail } from "@/hooks/useFactuurDetail";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { FactuurRegelForm } from "@/components/inkoop/FactuurRegelForm";
import { LeverancierMatchWidget } from "@/components/inkoop/LeverancierMatchWidget";
import {
  IngredientMatchBadge,
  type NewIngredientPrefill,
} from "@/components/inkoop/IngredientMatchBadge";
import { NieuwIngredientFromFactuurModal } from "@/components/inkoop/NieuwIngredientFromFactuurModal";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";

const STATUS_BADGES: Record<
  string,
  { variant: "default" | "warning" | "success" | "error"; label: string }
> = {
  verwerken: { variant: "default", label: "Verwerken..." },
  review: { variant: "warning", label: "Review nodig" },
  goedgekeurd: { variant: "success", label: "Goedgekeurd" },
  afgewezen: { variant: "error", label: "Afgewezen" },
};

// ============================================================
// PDF Preview — sticky op desktop, inline op mobile/tablet
// ============================================================
function FactuurPreview({
  bestandUrl,
  className = "",
}: {
  bestandUrl: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const isPdf = bestandUrl.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    supabase.storage
      .from("facturen")
      .createSignedUrl(bestandUrl, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [bestandUrl]);

  if (!url) {
    return (
      <div
        className={`rounded-xl border border-border/50 bg-muted/20 flex items-center justify-center ${className}`}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border/50 overflow-hidden bg-muted/20 ${className}`}
    >
      {isPdf ? (
        <iframe src={url} className="w-full h-full" title="Factuur preview" />
      ) : (
        <img
          src={url}
          alt="Factuur"
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}

// ============================================================
// Page
// ============================================================
export default function FactuurDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const factuurId = id ?? null;

  const { data: factuur, isLoading } = useFactuurDetail(factuurId);
  const {
    updateFactuur,
    deleteRegel,
    goedkeuren,
    afwijzen,
    bulkConfirmHighConfidence,
  } = useFactuurMutations();
  const { data: leveranciers } = useLeveranciers();

  const [addOpen, setAddOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [newIngState, setNewIngState] = useState<{
    regelId: string;
    prefill: NewIngredientPrefill;
  } | null>(null);

  // Local state voor editable factuurvelden (onBlur saves)
  const [factuurnummer, setFactuurnummer] = useState("");
  const [factuurdatum, setFactuurdatum] = useState("");

  useEffect(() => {
    if (factuur) {
      setFactuurnummer(factuur.factuurnummer ?? "");
      setFactuurdatum(factuur.factuurdatum ?? "");
    }
  }, [factuur]);

  const { highConfMatched, onzekereRegels, visibleRegels } = useMemo(() => {
    const regels = factuur?.regels ?? [];
    const high = regels.filter(
      (r) =>
        r.match_status === "matched" &&
        (r.ai_confidence ?? r.match_confidence ?? 0) > 0.85
    );
    const onzeker = regels.filter((r) => {
      const c = r.ai_confidence ?? r.match_confidence ?? 0;
      return (
        r.match_status === "unmatched" ||
        (r.match_status === "matched" && c <= 0.85)
      );
    });
    return {
      highConfMatched: high,
      onzekereRegels: onzeker,
      visibleRegels: reviewMode ? onzeker : regels,
    };
  }, [factuur?.regels, reviewMode]);

  if (isLoading || !factuur) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const badge = STATUS_BADGES[factuur.status] ?? STATUS_BADGES.review;
  const isEditable = factuur.status === "review";
  const leverancierOptions = (leveranciers ?? []).map((l: any) => ({
    value: l.id,
    label: l.naam,
  }));
  const berekenTotaal = factuur.regels.reduce((s, r) => s + (r.totaal ?? 0), 0);

  const handleGoedkeuren = () => {
    goedkeuren.mutate(factuurId!, {
      onSuccess: () => navigate("/inkoop"),
    });
  };

  const handleAfwijzen = () => {
    afwijzen.mutate(factuurId!, {
      onSuccess: () => navigate("/inkoop"),
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border/50 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate("/inkoop")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] -ml-2 px-2 rounded-md"
        >
          <ArrowLeft className="h-4 w-4" />
          Facturen
        </button>
        <div className="h-5 w-px bg-border" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">
            {factuur.bestandsnaam}
          </h1>
          {factuur.factuurnummer && (
            <p className="text-xs text-muted-foreground truncate">
              #{factuur.factuurnummer}
            </p>
          )}
        </div>
        <NestoBadge variant={badge.variant}>{badge.label}</NestoBadge>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_480px]">
          {/* Linkerkolom: PDF preview */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <FactuurPreview
              bestandUrl={factuur.bestand_url}
              className="h-[60vh] lg:h-[calc(100vh-180px)]"
            />
          </div>

          {/* Rechterkolom: data + regels */}
          <div className="space-y-6 min-w-0">
            {/* AI Match Widget */}
            <LeverancierMatchWidget
              factuurId={factuurId!}
              aiStatus={(factuur as any).ai_parsing_status ?? null}
              herkendNaam={factuur.leverancier_naam_herkend}
              huidigeLeverancierId={factuur.leverancier_id}
              huidigeLeverancierNaam={
                (leveranciers ?? []).find(
                  (l: any) => l.id === factuur.leverancier_id
                )?.naam ?? null
              }
              aiConfidence={(factuur as any).ai_confidence_overall ?? null}
              rawResponse={(factuur as any).ai_raw_response ?? null}
            />

            {/* Factuurgegevens */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Factuurgegevens
              </h3>
              <NestoSelect
                label="Leverancier"
                value={factuur.leverancier_id ?? ""}
                onValueChange={(v) =>
                  updateFactuur.mutate({ id: factuurId!, leverancier_id: v })
                }
                options={leverancierOptions}
                disabled={!isEditable}
              />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Factuurnummer
                </label>
                <Input
                  value={factuurnummer}
                  onChange={(e) => setFactuurnummer(e.target.value)}
                  onBlur={() => {
                    if (factuurnummer !== (factuur.factuurnummer ?? "")) {
                      updateFactuur.mutate({
                        id: factuurId!,
                        factuurnummer,
                      });
                    }
                  }}
                  disabled={!isEditable}
                  className="h-9"
                />
              </div>
              <div>
                <NestoDatePicker
                  label="Factuurdatum"
                  value={dateFromString(factuurdatum)}
                  onChange={(d) => {
                    const str = dateToString(d);
                    setFactuurdatum(str);
                    if (str !== (factuur.factuurdatum ?? "")) {
                      updateFactuur.mutate({
                        id: factuurId!,
                        factuurdatum: str || null,
                      });
                    }
                  }}
                  disabled={!isEditable}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Totaalbedrag
                </label>
                <Input
                  value={
                    berekenTotaal ? `€${berekenTotaal.toFixed(2)}` : "€0,00"
                  }
                  readOnly
                  className="h-9 bg-muted/30"
                />
              </div>
            </div>

            {/* Regels */}
            <div>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Regels ({factuur.regels.length})
                </h3>
                <div className="flex items-center gap-3">
                  {isEditable && onzekereRegels.length > 0 && (
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={reviewMode}
                        onChange={(e) => setReviewMode(e.target.checked)}
                        className="h-3 w-3"
                      />
                      Alleen onzekere ({onzekereRegels.length})
                    </label>
                  )}
                  {isEditable && !addOpen && (
                    <NestoButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Toevoegen
                    </NestoButton>
                  )}
                </div>
              </div>

              {addOpen && (
                <div className="mb-3">
                  <FactuurRegelForm
                    factuurId={factuurId!}
                    onDone={() => setAddOpen(false)}
                  />
                </div>
              )}

              <div className="space-y-2">
                {visibleRegels.map((r) => {
                  const conf = r.ai_confidence ?? r.match_confidence ?? 0;
                  const needsAttention =
                    r.match_status === "unmatched" ||
                    (r.match_status === "matched" && conf <= 0.85);
                  return (
                    <div
                      key={r.id}
                      className={`rounded-xl border p-3 space-y-2 ${
                        needsAttention
                          ? "border-warning/40 bg-warning/5"
                          : "border-border/30 bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {r.product_naam_herkend}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.hoeveelheid ?? "-"} {r.eenheid ?? ""} · €
                            {r.prijs_per_eenheid?.toFixed(2) ?? "-"}/eh · €
                            {r.totaal?.toFixed(2) ?? "-"}
                          </p>
                        </div>
                        {isEditable && (
                          <button
                            onClick={() => deleteRegel.mutate(r.id)}
                            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            aria-label="Verwijder regel"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {isEditable && (
                        <IngredientMatchBadge
                          regel={r}
                          leverancierId={factuur.leverancier_id}
                          onOpenNewIngredient={(regelId, prefill) =>
                            setNewIngState({ regelId, prefill })
                          }
                        />
                      )}
                    </div>
                  );
                })}

                {visibleRegels.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {reviewMode
                      ? "Alle regels zijn afgehandeld 🎉"
                      : "Nog geen regels. Voeg ze handmatig toe."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky bottom action bar — alleen bij review */}
      {isEditable && (
        <footer className="sticky bottom-0 z-30 bg-background border-t border-border/50 px-6 py-3">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {highConfMatched.length > 0 && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <NestoButton
                    variant="outline"
                    size="sm"
                    isLoading={bulkConfirmHighConfidence.isPending}
                    onClick={() =>
                      bulkConfirmHighConfidence.mutate(
                        highConfMatched.map((r) => r.id)
                      )
                    }
                  >
                    Bevestig {highConfMatched.length} high-confidence matches
                  </NestoButton>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NestoButton
                variant="outline"
                onClick={handleAfwijzen}
                isLoading={afwijzen.isPending}
                className="text-destructive hover:text-destructive min-h-[44px]"
              >
                Afwijzen
              </NestoButton>
              <NestoButton
                onClick={handleGoedkeuren}
                isLoading={goedkeuren.isPending}
                className="min-h-[44px]"
              >
                Goedkeuren & prijzen bijwerken
              </NestoButton>
            </div>
          </div>
        </footer>
      )}

      <NieuwIngredientFromFactuurModal
        open={!!newIngState}
        onClose={() => setNewIngState(null)}
        regelId={newIngState?.regelId ?? null}
        prefill={newIngState?.prefill ?? null}
        leverancierId={factuur.leverancier_id}
      />
    </div>
  );
}
