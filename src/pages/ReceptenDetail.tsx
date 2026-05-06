import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useRecept } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import {
  NestoTabs,
  NestoTabContent,
  NestoButton,
  NestoSelect,
  NestoInput,
  NestoNumericInput,
  NestoBadge,
  Spinner,
  ConfirmDialog,
} from "@/components/polar";
import { AllergeenPills } from "@/components/polar/AllergeenPills";
import { IngredintenTab } from "@/components/recepten/tabs/IngredintenTab";
import { BereidingTab } from "@/components/recepten/tabs/BereidingTab";
import { MethodesTab } from "@/components/recepten/tabs/MethodesTab";
import { AllergenenTab } from "@/components/recepten/tabs/AllergenenTab";
import { ChevronLeft, Archive, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { berekenPortieGrootte, getPrimaireMethode } from "@/utils/portieGrootte";
import { fmtEuroPrecise } from "@/lib/format";
import type { TabItem } from "@/components/polar";

const CATEGORIE_OPTIONS = [
  { value: "sauzen", label: "Sauzen" },
  { value: "bijgerechten", label: "Bijgerechten" },
  { value: "hoofdgerechten", label: "Hoofdgerechten" },
  { value: "desserts", label: "Desserts" },
  { value: "bases", label: "Bases" },
  { value: "marinades", label: "Marinades" },
  { value: "overig", label: "Overig" },
];

export default function ReceptenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recept, isLoading, error } = useRecept(id ?? null);
  const { updateRecept, archiveRecept } = useReceptMutations();

  const [activeTab, setActiveTab] = useState("ingredienten");
  const [naam, setNaam] = useState("");
  const [categorie, setCategorie] = useState("");
  const [porties, setPorties] = useState(1);
  const [actief, setActief] = useState(0);
  const [passief, setPassief] = useState(0);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  useEffect(() => {
    if (recept) {
      setNaam(recept.naam);
      setCategorie(recept.categorie);
      setPorties(recept.porties);
      setActief(recept.actieve_bereidingstijd ?? 0);
      setPassief(recept.passieve_bereidingstijd ?? 0);
    }
  }, [recept?.id, recept?.naam, recept?.categorie, recept?.porties, recept?.actieve_bereidingstijd, recept?.passieve_bereidingstijd]);

  const tabs: TabItem[] = useMemo(() => [
    { id: "ingredienten", label: "Ingrediënten" },
    { id: "bereiding", label: "Bereiding" },
    { id: "methodes", label: "Methodes" },
    { id: "allergenen", label: "Allergenen" },
  ], []);

  const isGerecht = recept?.type === "gerecht";

  const kostprijsPerPortie = recept && recept.porties > 0 && recept.totale_kostprijs != null
    ? recept.totale_kostprijs / recept.porties
    : null;

  const primaireMethode = recept ? getPrimaireMethode(recept.halffabricaat_methodes) : null;
  const portie = recept ? berekenPortieGrootte(
    primaireMethode?.output_hoeveelheid ?? null,
    primaireMethode?.output_eenheid ?? null,
    recept.porties
  ) : null;

  const outputDisplay = primaireMethode
    ? `${primaireMethode.output_hoeveelheid} ${primaireMethode.output_eenheid}`
    : null;
  const outputInBasisUnit = (() => {
    if (!primaireMethode) return null;
    const h = primaireMethode.output_hoeveelheid;
    const e = primaireMethode.output_eenheid;
    if (e === "kg") return { qty: h * 1000, unit: "g" };
    if (e === "L" || e === "l") return { qty: h * 1000, unit: "ml" };
    return { qty: h, unit: e };
  })();
  const kostprijsPerEenheid = recept && outputInBasisUnit && outputInBasisUnit.qty > 0 && recept.totale_kostprijs != null
    ? recept.totale_kostprijs / outputInBasisUnit.qty
    : null;

  const allergeenPills = useMemo(() => {
    if (!recept?.recept_allergenen) return [];
    return recept.recept_allergenen
      .filter((a) => a.status === "bevat" || a.status === "kan_bevatten")
      .map((a) => ({
        allergeen_id: a.allergeen_id,
        code: a.allergenen?.code ?? "?",
        naam_nl: a.allergenen?.naam_nl,
        status: a.status as "bevat" | "kan_bevatten",
      }));
  }, [recept?.recept_allergenen]);

  const handleFieldSave = (field: string, value: unknown) => {
    if (!recept) return;
    updateRecept.mutate({ id: recept.id, [field]: value });
  };

  const handleArchive = () => {
    if (!recept) return;
    archiveRecept.mutate(recept.id, {
      onSuccess: () => navigate("/recepten"),
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  // Error / not found state
  if (error || !recept) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Halffabricaat niet gevonden.</p>
        <NestoButton variant="outline" onClick={() => navigate("/recepten")} className="min-h-[44px]">
          Terug naar overzicht
        </NestoButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/recepten"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Halffabricaten</span>
      </Link>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — tabs */}
        <div className={`${activeTab === "methodes" ? "lg:col-span-5" : "lg:col-span-3"} space-y-5`}>
          <NestoTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <NestoTabContent value="ingredienten" activeValue={activeTab}>
            <IngredintenTab recept={recept} />
          </NestoTabContent>

          <NestoTabContent value="bereiding" activeValue={activeTab}>
            <BereidingTab recept={recept} />
          </NestoTabContent>

          <NestoTabContent value="methodes" activeValue={activeTab}>
            <MethodesTab recept={recept} />
          </NestoTabContent>

          <NestoTabContent value="allergenen" activeValue={activeTab}>
            <AllergenenTab recept={recept} />
          </NestoTabContent>
        </div>

        {/* Right column — sticky sidebar */}
        <div className={`lg:col-span-2 lg:sticky lg:top-6 lg:self-start space-y-4 ${activeTab === "methodes" ? "hidden lg:hidden" : ""}`}>
          {/* Card 1: Basisinfo */}
          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground truncate">{recept.naam}</h2>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Naam</label>
              <NestoInput
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                onBlur={() => naam.trim() && naam !== recept.naam && handleFieldSave("naam", naam.trim())}
                className="h-11"
              />
            </div>
            <NestoSelect
              label="Categorie"
              value={categorie}
              onValueChange={(v) => {
                setCategorie(v);
                handleFieldSave("categorie", v);
              }}
              options={CATEGORIE_OPTIONS}
            />
            <div className="grid grid-cols-2 gap-3">
              {isGerecht && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Porties</label>
                  <NestoNumericInput
                    min={1}
                    integer
                    value={porties}
                    onValueChange={(v) => {
                      const next = v ?? 1;
                      setPorties(next);
                      if (next !== recept.porties) handleFieldSave("porties", next);
                    }}
                    allowEmpty={false}
                    fallback={1}
                    className="h-9 text-xs"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Actief (min)</label>
                <NestoNumericInput
                  min={0}
                  integer
                  value={actief || null}
                  onValueChange={(v) => {
                    const next = v ?? 0;
                    setActief(next);
                    if (next !== (recept.actieve_bereidingstijd ?? 0)) {
                      handleFieldSave("actieve_bereidingstijd", next || null);
                    }
                  }}
                  allowEmpty
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Passief (min)</label>
              <NestoNumericInput
                min={0}
                integer
                value={passief || null}
                onValueChange={(v) => {
                  const next = v ?? 0;
                  setPassief(next);
                  if (next !== (recept.passieve_bereidingstijd ?? 0)) {
                    handleFieldSave("passieve_bereidingstijd", next || null);
                  }
                }}
                allowEmpty
                className="h-9 text-xs"
              />
            </div>

            {/* Per portie (gerecht) of Output per bereiding (halffabricaat) */}
            {isGerecht && portie && (
              <TooltipProvider>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Per portie</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{portie.display}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span><Info className="h-3 w-3 text-muted-foreground cursor-help" /></span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Berekend op basis van de totale output van de bereiding gedeeld door het aantal porties.
                        Bijvoorbeeld: {primaireMethode?.output_hoeveelheid}{primaireMethode?.output_eenheid} output ÷ {recept.porties} porties = {portie?.display} per portie.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>
            )}
            {!isGerecht && outputDisplay && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Output per bereiding</label>
                <span className="text-sm font-medium">{outputDisplay}</span>
              </div>
            )}
          </div>

          {/* Card 2: Kostprijs */}
          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Kostprijs
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Ingrediënten</span>
              <span className="text-right">
                {recept.totale_ingredientkostprijs != null
                  ? `€${recept.totale_ingredientkostprijs.toFixed(2)}`
                  : "—"}
              </span>
              <span className="text-muted-foreground">Arbeid</span>
              <span className="text-right">
                {recept.arbeidskostprijs != null
                  ? `€${recept.arbeidskostprijs.toFixed(2)}`
                  : "—"}
              </span>
              <span className="font-semibold pt-1 border-t border-border/50">Totaal</span>
              <span className="font-semibold text-right pt-1 border-t border-border/50">
                {recept.totale_kostprijs != null
                  ? `€${recept.totale_kostprijs.toFixed(2)}`
                  : "—"}
              </span>
              {isGerecht ? (
                <>
                  <span className="text-muted-foreground">Per portie{portie ? ` (${portie.display})` : ""}</span>
                  <span className="text-right font-medium text-primary">
                    {kostprijsPerPortie != null
                      ? `€${kostprijsPerPortie.toFixed(2)}`
                      : "Nog niet berekend"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">Per bereiding{outputDisplay ? ` (${outputDisplay})` : ""}</span>
                  <span className="text-right font-medium text-primary">
                    {recept.totale_kostprijs != null
                      ? `€${recept.totale_kostprijs.toFixed(2)}`
                      : "Nog niet berekend"}
                  </span>
                  {kostprijsPerEenheid != null && outputInBasisUnit && (
                    <>
                      <span className="text-muted-foreground">Per {outputInBasisUnit.unit}</span>
                      <span className="text-right text-foreground">
                        {fmtEuroPrecise(kostprijsPerEenheid)}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card 3: Allergenen */}
          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Allergenen
            </h3>
            <AllergeenPills allergenen={allergeenPills} showEmpty emptyText="Geen allergenen" />
          </div>

          {/* Card 4: Acties */}
          <div className="space-y-2">
            {!recept.is_archived && (
              <NestoButton
                variant="outline"
                onClick={() => setShowArchiveConfirm(true)}
                isLoading={archiveRecept.isPending}
                className="w-full min-h-[44px] text-destructive hover:text-destructive"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archiveren
              </NestoButton>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Halffabricaat archiveren"
        description={`Weet je zeker dat je "${recept.naam}" wilt archiveren?`}
        confirmLabel="Archiveren"
        variant="destructive"
        onConfirm={handleArchive}
      />
    </div>
  );
}
