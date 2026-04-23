import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  NestoButton,
  NestoBadge,
  Spinner,
  NestoDatePicker,
  dateFromString,
  dateToString,
} from "@/components/polar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFactuurDetail } from "@/hooks/useFactuurDetail";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { FactuurRegelForm } from "@/components/inkoop/FactuurRegelForm";
import { LeverancierMatchWidget } from "@/components/inkoop/LeverancierMatchWidget";
import { LeverancierSelectCombobox } from "@/components/inkoop/LeverancierSelectCombobox";
import { BulkCreateIngredientsDialog } from "@/components/inkoop/BulkCreateIngredientsDialog";
import { GoedkeurenPreviewModal } from "@/components/inkoop/GoedkeurenPreviewModal";
import type { PreviewData } from "@/hooks/usePreviewGoedkeuring";
import { RegelsSamenvattingCard } from "@/components/inkoop/RegelsSamenvattingCard";
import { RegelFilterChips, type ChipId } from "@/components/inkoop/RegelFilterChips";
import { RegelSecties, categoriseer } from "@/components/inkoop/RegelSecties";
import { VerpakkingModal } from "@/components/inkoop/VerpakkingModal";
import { isVerpakkingRegel } from "@/lib/factuur-categories";
import { supabase } from "@/integrations/supabase/client";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";
import { ArrowLeft, Plus, MoreHorizontal, Copy, ArrowRight } from "lucide-react";

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
    skipRegels,
  } = useFactuurMutations();
  const { data: leveranciers } = useLeveranciers();

  const [addOpen, setAddOpen] = useState(false);
  const [chip, setChip] = useState<ChipId | null>(null);
  const [bulkCreateRegels, setBulkCreateRegels] = useState<FactuurRegel[] | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [verpakkingOpen, setVerpakkingOpen] = useState(false);

  // Local state voor editable factuurvelden (onBlur saves)
  const [factuurnummer, setFactuurnummer] = useState("");
  const [factuurdatum, setFactuurdatum] = useState("");

  useEffect(() => {
    if (factuur) {
      setFactuurnummer(factuur.factuurnummer ?? "");
      setFactuurdatum(factuur.factuurdatum ?? "");
    }
  }, [factuur]);

  const { highConfRegels, verpakkingRegels, counts, smartDefaultChip } = useMemo(() => {
    const regels = factuur?.regels ?? [];

    // Sprint A3: scheid verpakking-regels van échte ingrediënt-regels.
    const verpakking = regels.filter(isVerpakkingRegel);
    const ingredientRegels = regels.filter((r) => !isVerpakkingRegel(r));

    // Categoriseer alleen ingrediënt-regels (verpakking valt buiten de categorisering).
    const cats = ingredientRegels.map((r) => ({ r, cat: categoriseer(r) }));

    const counts = {
      all: ingredientRegels.length,
      nieuw: cats.filter((x) => x.cat === "geen").length,
      onzeker: cats.filter((x) => x.cat === "ai" || x.cat === "geen").length,
      gematcht: cats.filter((x) => x.cat === "perfect" || x.cat === "naam").length,
      verpakking: verpakking.length,
    };

    // High-conf voor bulk-bevestig: matched + (ai_confidence | match_confidence) >= 0.9
    const highConf = ingredientRegels.filter((r) => {
      const c = r.match_confidence ?? r.ai_confidence ?? 0;
      return r.match_status === "matched" && c >= 0.9;
    });

    // Smart default: als > 5 onzeker → "onzeker", anders "all"
    const smart: ChipId = counts.onzeker > 5 ? "onzeker" : "all";

    return {
      highConfRegels: highConf,
      verpakkingRegels: verpakking,
      counts,
      smartDefaultChip: smart,
    };
  }, [factuur?.regels]);

  // Set default chip pas wanneer factuur klaar is en chip nog niet gezet
  useEffect(() => {
    if (chip === null && factuur && factuur.regels.length > 0) {
      setChip(smartDefaultChip);
    }
  }, [chip, factuur, smartDefaultChip]);

  if (isLoading || !factuur) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const badge = STATUS_BADGES[factuur.status] ?? STATUS_BADGES.review;
  const isEditable = factuur.status === "review";
  const berekenTotaal = factuur.regels.reduce((s, r) => s + (r.totaal ?? 0), 0);
  const activeChip: ChipId = chip ?? "all";

  const handleGoedkeuren = () => {
    setPreviewOpen(true);
  };

  const handleConfirmGoedkeuren = (snapshot: PreviewData) => {
    goedkeuren.mutate(
      { id: factuurId!, snapshot },
      {
        onSuccess: () => {
          setPreviewOpen(false);
          navigate("/inkoop");
        },
      }
    );
  };

  const handleAfwijzen = () => {
    afwijzen.mutate(factuurId!, {
      onSuccess: () => navigate("/inkoop"),
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header (NIET sticky) */}
      <header className="bg-background border-b border-border/50 px-6 py-3 flex items-center gap-4">
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
        {isEditable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Meer acties"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleAfwijzen}
                className="text-destructive focus:text-destructive"
              >
                Afwijzen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">
        {/* Duplicate banner — toon wanneer factuur is gemarkeerd als duplicaat */}
        {(() => {
          const raw = (factuur as any).ai_raw_response;
          if (raw?.error !== "duplicate_upload") return null;
          const origId = raw.original_factuur_id as string | undefined;
          const origLabel =
            raw.original_factuurnummer ||
            raw.original_bestandsnaam ||
            (origId ? `factuur ${origId.slice(0, 8)}` : "originele factuur");
          return (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
              <Copy className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Duplicaat van {origLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deze factuur is gelijk aan een andere upload die al verwerkt
                  wordt. Open de originele factuur om de regels te bekijken.
                </p>
              </div>
              {origId && (
                <NestoButton
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/inkoop/facturen/${origId}`)}
                  className="shrink-0"
                >
                  Ga naar originele factuur
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </NestoButton>
              )}
            </div>
          );
        })()}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_480px]">
          {/* Linkerkolom: PDF preview (sticky desktop) */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <FactuurPreview
              bestandUrl={factuur.bestand_url}
              className="h-[60vh] lg:h-[calc(100vh-100px)]"
            />
          </div>

          {/* Rechterkolom: data + regels (natuurlijke scroll) */}
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
              <LeverancierSelectCombobox
                value={factuur.leverancier_id}
                onChange={(v) =>
                  updateFactuur.mutate({ id: factuurId!, leverancier_id: v })
                }
                leveranciers={leveranciers ?? []}
                disabled={!isEditable}
                prefillNewName={
                  !factuur.leverancier_id ? factuur.leverancier_naam_herkend : null
                }
                fuzzyKandidaten={factuur.fuzzy_kandidaten ?? []}
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

            {/* Samenvatting-card */}
            <RegelsSamenvattingCard
              regels={factuur.regels}
              totaal={berekenTotaal}
              highConfRegels={highConfRegels}
              isBulkPending={bulkConfirmHighConfidence.isPending}
              isEditable={isEditable}
              onBulkConfirm={() =>
                bulkConfirmHighConfidence.mutate(highConfRegels.map((r) => r.id))
              }
              onOpenVerpakking={
                verpakkingRegels.length > 0
                  ? () => setVerpakkingOpen(true)
                  : undefined
              }
            />

            {/* Filter-chips + Toevoegen */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <RegelFilterChips
                active={activeChip}
                onChange={setChip}
                counts={counts}
              />
              {isEditable && !addOpen && (
                <NestoButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Regel toevoegen
                </NestoButton>
              )}
            </div>

            {addOpen && (
              <div>
                <FactuurRegelForm
                  factuurId={factuurId!}
                  onDone={() => setAddOpen(false)}
                />
              </div>
            )}

            {/* Regel-secties */}
            {activeChip === "verpakking" ? (
              verpakkingRegels.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setVerpakkingOpen(true)}
                  className="w-full rounded-xl border border-border/50 bg-muted/20 p-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-sm font-medium">
                    📦 {verpakkingRegels.length} verpakking-regels
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tellen mee in factuur-totaal · klik om te bekijken of een
                    foutief geclassificeerde regel te verwijderen
                  </p>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Geen verpakking-regels op deze factuur.
                </p>
              )
            ) : (
              <RegelSecties
                regels={factuur.regels}
                filter={activeChip}
                isEditable={isEditable}
                leverancierId={factuur.leverancier_id}
                leverancierNaam={
                  (leveranciers ?? []).find(
                    (l: any) => l.id === factuur.leverancier_id
                  )?.naam ?? factuur.leverancier_naam_herkend ?? null
                }
                onDeleteRegel={(rid) => deleteRegel.mutate(rid)}
                onOpenBulkCreate={(regels) => setBulkCreateRegels(regels)}
              />
            )}

            {factuur.regels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nog geen regels. Voeg ze handmatig toe.
              </p>
            )}

            {/* Footer-knoppen INLINE (niet sticky) — alleen in review */}
            {isEditable && (
              <div className="pt-4 border-t border-border/50 flex items-center justify-end gap-2 flex-wrap">
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
            )}
          </div>
        </div>
      </main>

      <BulkCreateIngredientsDialog
        open={!!bulkCreateRegels}
        onClose={() => setBulkCreateRegels(null)}
        regels={bulkCreateRegels ?? []}
        leverancierId={factuur.leverancier_id}
      />

      <VerpakkingModal
        open={verpakkingOpen}
        onClose={() => setVerpakkingOpen(false)}
        regels={verpakkingRegels}
        isEditable={isEditable}
        onDeleteRegel={(rid) => deleteRegel.mutate(rid)}
      />

      <GoedkeurenPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={handleConfirmGoedkeuren}
        isConfirming={goedkeuren.isPending}
        factuur={{
          factuurnummer: factuur.factuurnummer,
          leverancierNaam:
            (leveranciers ?? []).find((l: any) => l.id === factuur.leverancier_id)
              ?.naam ?? factuur.leverancier_naam_herkend ?? null,
          totaal: berekenTotaal,
          regels: factuur.regels,
        }}
      />
    </div>
  );
}
