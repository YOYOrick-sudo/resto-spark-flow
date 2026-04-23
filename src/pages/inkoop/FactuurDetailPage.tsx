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
import { NestoTabs, type TabItem } from "@/components/polar/NestoTabs";
import { SearchBar } from "@/components/polar/SearchBar";
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
import { ProcessFactuurModal } from "@/components/inkoop/ProcessFactuurModal";
import { RegelsSamenvattingCard } from "@/components/inkoop/RegelsSamenvattingCard";
import { RegelSecties } from "@/components/inkoop/RegelSecties";
import { VerpakkingModal } from "@/components/inkoop/VerpakkingModal";
import { FactuurBlockedBanner } from "@/components/inkoop/FactuurBlockedBanner";
import { isVerpakkingRegel } from "@/lib/factuur-categories";
import { fmtEuro } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Copy,
  ArrowRight,
  CheckCircle2,
  Package,
} from "lucide-react";

// Sprint B1: tab-IDs voor de vereenvoudigde 3-tabs structuur.
type TabId = "herkend" | "nieuw" | "verpakking";

const STATUS_BADGES: Record<
  string,
  { variant: "default" | "warning" | "success" | "error"; label: string }
> = {
  verwerken: { variant: "default", label: "Verwerken..." },
  review: { variant: "warning", label: "Review nodig" },
  review_blocked: { variant: "warning", label: "Manager-review" },
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
  const { updateFactuur, deleteRegel, afwijzen } = useFactuurMutations();
  const { data: leveranciers } = useLeveranciers();

  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("herkend");
  const [search, setSearch] = useState("");
  const [bulkCreateRegels, setBulkCreateRegels] = useState<FactuurRegel[] | null>(null);
  const [processOpen, setProcessOpen] = useState(false);
  const [verpakkingOpen, setVerpakkingOpen] = useState(false);

  const [factuurnummer, setFactuurnummer] = useState("");
  const [factuurdatum, setFactuurdatum] = useState("");

  useEffect(() => {
    if (factuur) {
      setFactuurnummer(factuur.factuurnummer ?? "");
      setFactuurdatum(factuur.factuurdatum ?? "");
    }
  }, [factuur]);

  const { verpakkingRegels, ingredientRegels, counts } = useMemo(() => {
    const regels = factuur?.regels ?? [];
    const verpakking = regels.filter(isVerpakkingRegel);
    const ingredient = regels.filter((r) => !isVerpakkingRegel(r));

    const herkendCount = ingredient.filter(
      (r) =>
        r.ingredient_id != null &&
        r.is_nieuw_ingredient !== true &&
        (r.match_status === "matched" || r.match_status === "manual")
    ).length;
    const nieuwCount = ingredient.filter(
      (r) =>
        r.is_nieuw_ingredient === true ||
        (r.ingredient_id == null && r.match_status !== "skipped")
    ).length;

    return {
      verpakkingRegels: verpakking,
      ingredientRegels: ingredient,
      counts: {
        herkend: herkendCount,
        nieuw: nieuwCount,
        verpakking: verpakking.length,
      },
    };
  }, [factuur?.regels]);

  // Sprint Enterprise Pass — bouw conditionele tabs (verberg tabs met count=0).
  const tabs: TabItem[] = useMemo(() => {
    const all: TabItem[] = [
      { id: "herkend", label: "Herkend", count: counts.herkend, icon: CheckCircle2 },
      { id: "nieuw", label: "Nieuw aanmaken", count: counts.nieuw, icon: Plus },
      { id: "verpakking", label: "Verpakking", count: counts.verpakking, icon: Package },
    ];
    return all.filter((t) => (t.count ?? 0) > 0);
  }, [counts]);

  // Auto-fallback naar eerste zichtbare tab als huidige tab leeg raakt.
  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.find((t) => t.id === tab)) {
      setTab(tabs[0].id as TabId);
    }
  }, [tabs, tab]);

  const visibleRegels = useMemo(() => {
    let base: FactuurRegel[] = [];
    if (tab === "herkend") {
      base = ingredientRegels.filter(
        (r) =>
          r.ingredient_id != null &&
          r.is_nieuw_ingredient !== true &&
          (r.match_status === "matched" || r.match_status === "manual")
      );
    } else if (tab === "nieuw") {
      base = ingredientRegels.filter(
        (r) =>
          r.is_nieuw_ingredient === true ||
          (r.ingredient_id == null && r.match_status !== "skipped")
      );
    } else {
      base = verpakkingRegels;
    }
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) =>
      (r.product_naam_herkend ?? "").toLowerCase().includes(q)
    );
  }, [tab, search, ingredientRegels, verpakkingRegels]);

  if (isLoading || !factuur) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const badge = STATUS_BADGES[factuur.status] ?? STATUS_BADGES.review;
  const isEditable = factuur.status === "review";
  const isBlocked = factuur.status === "review_blocked";
  const berekenTotaal = factuur.regels.reduce((s, r) => s + (r.totaal ?? 0), 0);

  const handleVerwerk = () => setProcessOpen(true);
  const handleAfwijzen = () => {
    afwijzen.mutate(factuurId!, { onSuccess: () => navigate("/inkoop") });
  };

  // Toon zoekbalk alleen wanneer de actieve tab >10 items heeft (drempel uit plan).
  const activeTabCount =
    tab === "herkend"
      ? counts.herkend
      : tab === "nieuw"
        ? counts.nieuw
        : counts.verpakking;
  const showSearch = tabs.length > 1 && tab !== "verpakking" && activeTabCount > 10;

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
            {/* Sprint Enterprise Pass — Blocked banner heeft voorrang. */}
            {isBlocked && (
              <FactuurBlockedBanner
                reason={factuur.validation_blocked_reason}
                retries={factuur.validation_retries ?? 0}
              />
            )}

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
            </div>

            {/* Samenvatting-card — header + collapsible bedrag-details */}
            <RegelsSamenvattingCard
              regels={factuur.regels}
              totaal={berekenTotaal}
              leverancierNaam={
                (leveranciers ?? []).find(
                  (l: any) => l.id === factuur.leverancier_id
                )?.naam ?? factuur.leverancier_naam_herkend ?? null
              }
              factuurnummer={factuur.factuurnummer}
              factuurdatum={factuur.factuurdatum}
              subtotaalExclBtw={factuur.subtotaal_excl_btw}
              btwBedrag={factuur.btw_bedrag}
              btwPercentage={factuur.btw_percentage}
              totaalInclBtw={factuur.totaal_incl_btw}
            />

            {/* Sprint Enterprise Pass — bij review_blocked toont alleen read-only
                regel-lijst zonder tabs/zoek/verwerk. Banner staat al boven. */}
            {isBlocked ? (
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Geëxtraheerde regels (read-only)
                </h3>
                <RegelSecties
                  mode="flat"
                  visibleRegels={factuur.regels}
                  isEditable={false}
                  leverancierId={factuur.leverancier_id}
                  leverancierNaam={
                    (leveranciers ?? []).find(
                      (l: any) => l.id === factuur.leverancier_id
                    )?.naam ?? factuur.leverancier_naam_herkend ?? null
                  }
                  onDeleteRegel={() => {}}
                  onOpenBulkCreate={() => {}}
                  showBulkCreate={false}
                />
              </div>
            ) : (
              <>
                {/* Conditionele tabs + zoekbalk */}
                {tabs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      {tabs.length > 1 ? (
                        <NestoTabs
                          tabs={tabs}
                          activeTab={tab}
                          onTabChange={(id) => setTab(id as TabId)}
                        />
                      ) : (
                        <div className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                          {(() => {
                            const Icon = tabs[0].icon;
                            return Icon ? <Icon className="h-4 w-4" /> : null;
                          })()}
                          {tabs[0].label}
                          <span className="text-muted-foreground tabular-nums">
                            {tabs[0].count}
                          </span>
                        </div>
                      )}
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
                    {showSearch && (
                      <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Zoek binnen deze tab op productnaam..."
                        size="sm"
                      />
                    )}
                  </div>
                )}

                {addOpen && (
                  <div>
                    <FactuurRegelForm
                      factuurId={factuurId!}
                      onDone={() => setAddOpen(false)}
                    />
                  </div>
                )}

                {/* Regel-lijst per tab */}
                {tabs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Geen regels op deze factuur. Voeg ze handmatig toe.
                  </p>
                ) : tab === "verpakking" ? (
                  verpakkingRegels.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setVerpakkingOpen(true)}
                      className="w-full rounded-xl border border-border/50 bg-muted/20 p-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="text-sm font-medium inline-flex items-center gap-1.5">
                        <Package className="h-4 w-4" />
                        {verpakkingRegels.length} verpakking-regels
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tellen mee in factuur-totaal · klik om te bekijken of
                        een foutief geclassificeerde regel te verwijderen
                      </p>
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Geen verpakking-regels op deze factuur.
                    </p>
                  )
                ) : (
                  <RegelSecties
                    mode="flat"
                    visibleRegels={visibleRegels}
                    isEditable={isEditable}
                    leverancierId={factuur.leverancier_id}
                    leverancierNaam={
                      (leveranciers ?? []).find(
                        (l: any) => l.id === factuur.leverancier_id
                      )?.naam ?? factuur.leverancier_naam_herkend ?? null
                    }
                    onDeleteRegel={(rid) => deleteRegel.mutate(rid)}
                    onOpenBulkCreate={(regels) => setBulkCreateRegels(regels)}
                    showBulkCreate={tab === "nieuw"}
                  />
                )}

                {/* Verwerk-knop — alleen in editable, niet-blocked state */}
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
                      onClick={handleVerwerk}
                      className="min-h-[44px]"
                    >
                      Verwerk factuur ({fmtEuro(berekenTotaal)})
                    </NestoButton>
                  </div>
                )}
              </>
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

      <ProcessFactuurModal
        open={processOpen}
        onClose={() => setProcessOpen(false)}
        factuur={factuur}
        factuurId={factuurId!}
      />
    </div>
  );
}
