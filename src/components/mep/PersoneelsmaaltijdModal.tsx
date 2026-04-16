import { useState, useMemo, useEffect } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, ChevronDown, ChevronRight, Info, Sparkles } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useGerechtSearch } from "@/hooks/useGerechtSearch";
import { useWasteMutation, type WasteInput } from "@/hooks/useWasteMutation";
import { useMedewerkers } from "@/hooks/useMedewerkers";
import { useBijnaVerlopen } from "@/hooks/useBijnaVerlopen";
import { useVoorraadOverschot } from "@/hooks/useVoorraadOverschot";
import { matchSuggestieToItems } from "@/utils/matchSuggestieToItems";
import { getPortieVoorPersonen } from "@/utils/portieDefaults";
import { berekenPortieGrootte, getPrimaireMethode, converteerNaarMethodeEenheid } from "@/utils/portieGrootte";
import { nestoToast } from "@/lib/nestoToast";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

interface PersoneelsmaaltijdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ItemType = "ingrediënt" | "halffabricaat" | "gerecht";

interface BreakdownIngredient {
  naam: string;
  eenheid: string;
  hoeveelheidPerPortie: number;
}

interface MealItem {
  id: string;
  type: ItemType;
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  kostprijs: number | null;
  receptId?: string;
  gerechtId?: string;
  ingredientId?: string;
  isAuto?: boolean;
  breakdown?: BreakdownIngredient[];
  breakdownLoading?: boolean;
  portieDisplay?: string | null;
  methodeOutputHoeveelheid?: number | null;
  methodeOutputEenheid?: string | null;
  receptPorties?: number | null;
}

export function PersoneelsmaaltijdModal({ open, onOpenChange }: PersoneelsmaaltijdModalProps) {
  const [aantalPersonen, setAantalPersonen] = useState(1);
  const [items, setItems] = useState<MealItem[]>([]);
  const [selectedMedewerkerIds, setSelectedMedewerkerIds] = useState<string[]>([]);
  const { currentLocation } = useUserContext();

  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAttempts, setAiAttempts] = useState(0);

  // Bijna verlopen + overstocked data
  const { data: bijnaVerlopen = [] } = useBijnaVerlopen(2);
  const { data: overstocked = [] } = useVoorraadOverschot();
  const hasRelevantItems = bijnaVerlopen.length > 0 || overstocked.length > 0;

  // Search states for each section
  const [searchMain, setSearchMain] = useState("");
  const [searchGerecht, setSearchGerecht] = useState("");
  const [searchSchatting, setSearchSchatting] = useState("");

  // Collapsed sections
  const [gerechtOpen, setGerechtOpen] = useState(false);
  const [schattingOpen, setSchattingOpen] = useState(false);

  // Search queries
  const { data: hfResults = [] } = useHalffabricaatSearch(searchMain);
  const { data: igResultsMain = [] } = useIngredientSearch(searchMain);
  const { data: gerechtResults = [] } = useGerechtSearch(searchGerecht);
  const { data: igResultsSchatting = [] } = useIngredientSearch(searchSchatting);
  const { data: medewerkers = [] } = useMedewerkers();

  const hasMedewerkers = medewerkers.length > 0;

  // Sync aantalPersonen from checked medewerkers
  useEffect(() => {
    if (hasMedewerkers && selectedMedewerkerIds.length > 0) {
      setAantalPersonen(selectedMedewerkerIds.length);
    }
  }, [selectedMedewerkerIds, hasMedewerkers]);

  const wasteMutation = useWasteMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showMainDropdown = searchMain.trim().length >= 2;
  const showGerechtDropdown = searchGerecht.trim().length >= 2;
  const showSchattingDropdown = searchSchatting.trim().length >= 2;

  // Add halffabricaat
  const addHalffabricaat = async (hf: typeof hfResults[0]) => {
    const itemId = crypto.randomUUID();
    const primaireMethode = getPrimaireMethode(hf.methodes ?? []);
    const portie = berekenPortieGrootte(
      primaireMethode?.output_hoeveelheid ?? null,
      primaireMethode?.output_eenheid ?? null,
      hf.porties
    );
    setItems((prev) => [
      ...prev,
      {
        id: itemId,
        type: "halffabricaat",
        naam: hf.naam,
        hoeveelheid: 1,
        eenheid: "portie",
        kostprijs: null,
        receptId: hf.id,
        breakdownLoading: true,
        portieDisplay: portie?.display ?? null,
        methodeOutputHoeveelheid: primaireMethode?.output_hoeveelheid ?? null,
        methodeOutputEenheid: primaireMethode?.output_eenheid ?? null,
        receptPorties: hf.porties,
      },
    ]);
    setSearchMain("");

    try {
      const { data: receptIngs } = await supabase
        .from("recept_ingredienten")
        .select("hoeveelheid, ingredient:ingredienten(naam, eenheid)")
        .eq("recept_id", hf.id);

      const porties = hf.porties || 1;
      const breakdown: BreakdownIngredient[] = (receptIngs ?? [])
        .filter((ri) => ri.ingredient)
        .map((ri) => ({
          naam: (ri.ingredient as any).naam,
          eenheid: (ri.ingredient as any).eenheid,
          hoeveelheidPerPortie: ri.hoeveelheid / porties,
        }));

      setItems((prev) =>
        prev.map((i) => i.id === itemId ? { ...i, breakdown, breakdownLoading: false } : i)
      );
    } catch {
      setItems((prev) =>
        prev.map((i) => i.id === itemId ? { ...i, breakdownLoading: false } : i)
      );
    }
  };

  // Add ingredient (manual section)
  const addIngredientManual = (ig: typeof igResultsMain[0]) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "ingrediënt",
        naam: ig.naam,
        hoeveelheid: 1,
        eenheid: ig.eenheid,
        kostprijs: ig.kostprijs ?? null,
        ingredientId: ig.id,
      },
    ]);
    setSearchMain("");
  };

  // Add gerecht
  const addGerecht = async (g: typeof gerechtResults[0]) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "gerecht",
        naam: g.naam,
        hoeveelheid: aantalPersonen,
        eenheid: "portie",
        kostprijs: null,
        gerechtId: g.id,
      },
    ]);
    setSearchGerecht("");
  };

  // Add ingredient (estimation section — auto portion)
  const addIngredientSchatting = (ig: typeof igResultsSchatting[0]) => {
    const portie = getPortieVoorPersonen(ig.categorie, aantalPersonen);
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "ingrediënt",
        naam: ig.naam,
        hoeveelheid: portie.hoeveelheid,
        eenheid: portie.eenheid,
        kostprijs: ig.kostprijs ?? null,
        ingredientId: ig.id,
        isAuto: true,
      },
    ]);
    setSearchSchatting("");
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItemHoeveelheid = (id: string, h: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, hoeveelheid: h, isAuto: false } : i))
    );
  };

  const updateItemEenheid = (id: string, eenheid: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        // When switching eenheid, reset hoeveelheid to sensible default
        let newHoeveelheid = i.hoeveelheid;
        if (eenheid === "portie" && i.eenheid !== "portie") {
          newHoeveelheid = 1;
        } else if (eenheid !== "portie" && i.eenheid === "portie") {
          // Convert porties to weight: porties × portieGrootte
          const portieGrootte = (i.methodeOutputHoeveelheid ?? 0) / (i.receptPorties ?? 1);
          let gewicht = i.hoeveelheid * portieGrootte;
          const methodeEenheid = i.methodeOutputEenheid ?? "g";
          if (eenheid === "g" && methodeEenheid === "kg") gewicht *= 1000;
          else if (eenheid === "kg" && methodeEenheid === "g") gewicht /= 1000;
          newHoeveelheid = Math.round(gewicht * 100) / 100;
        }
        return { ...i, eenheid, hoeveelheid: newHoeveelheid, isAuto: false };
      })
    );
  };

  // Submit
  const handleSubmit = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      let totalIngredients = 0;

      for (const item of items) {
        if (item.type === "ingrediënt" && item.ingredientId) {
          // Direct ingredient write-off
          await wasteMutation.mutateAsync({
            ingredient_id: item.ingredientId,
            hoeveelheid: item.hoeveelheid,
            eenheid: item.eenheid,
            categorie: "personeelsmaaltijd",
            geschatte_kosten: item.kostprijs ? Math.round(item.hoeveelheid * item.kostprijs * 100) / 100 : null,
          });
          totalIngredients++;
        } else if (item.type === "halffabricaat" && item.receptId) {
          // Fetch recept_ingredienten → write off each
          const { data: receptIngs } = await supabase
            .from("recept_ingredienten")
            .select("ingredient_id, hoeveelheid, eenheid, ingredient:ingredienten(kostprijs)")
            .eq("recept_id", item.receptId);

          // Calculate portion multiplier based on eenheid
          let portieFractie = item.hoeveelheid;
          if (item.eenheid !== "portie" && item.methodeOutputHoeveelheid && item.receptPorties) {
            // Convert entered weight to method output eenheid, then calculate fraction
            const portieGrootte = item.methodeOutputHoeveelheid / item.receptPorties;
            const hoeveelheidInMethodeEenheid = converteerNaarMethodeEenheid(
              item.hoeveelheid,
              item.eenheid,
              item.methodeOutputEenheid ?? "g"
            );
            portieFractie = hoeveelheidInMethodeEenheid / portieGrootte;
          }

          for (const ri of receptIngs ?? []) {
            if (!ri.ingredient_id) continue;
            const kostprijs = (ri.ingredient as any)?.kostprijs ?? null;
            const qtyPerPortie = ri.hoeveelheid / (item.receptPorties ?? 1);
            const qty = qtyPerPortie * portieFractie;
            await wasteMutation.mutateAsync({
              ingredient_id: ri.ingredient_id,
              hoeveelheid: qty,
              eenheid: ri.eenheid,
              categorie: "personeelsmaaltijd",
              geschatte_kosten: kostprijs ? Math.round(qty * kostprijs * 100) / 100 : null,
            });
            totalIngredients++;
          }
        } else if (item.type === "gerecht" && item.gerechtId) {
          // Fetch gerecht_componenten → handle both recept and ingredient types
          const { data: componenten } = await supabase
            .from("gerecht_componenten")
            .select("type, recept_id, ingredient_id, hoeveelheid, eenheid")
            .eq("gerecht_id", item.gerechtId);

          for (const comp of componenten ?? []) {
            if (comp.type === "recept" && comp.recept_id) {
              // Fetch recept ingredients
              const { data: receptIngs } = await supabase
                .from("recept_ingredienten")
                .select("ingredient_id, hoeveelheid, eenheid, ingredient:ingredienten(kostprijs)")
                .eq("recept_id", comp.recept_id);

              for (const ri of receptIngs ?? []) {
                if (!ri.ingredient_id) continue;
                const kostprijs = (ri.ingredient as any)?.kostprijs ?? null;
                const qty = ri.hoeveelheid * comp.hoeveelheid * item.hoeveelheid;
                await wasteMutation.mutateAsync({
                  ingredient_id: ri.ingredient_id,
                  hoeveelheid: qty,
                  eenheid: ri.eenheid,
                  categorie: "personeelsmaaltijd",
                  geschatte_kosten: kostprijs ? Math.round(qty * kostprijs * 100) / 100 : null,
                });
                totalIngredients++;
              }
            } else if (comp.type === "ingrediënt" && comp.ingredient_id) {
              // Direct ingredient on gerecht
              const { data: ingData } = await supabase
                .from("ingredienten")
                .select("kostprijs")
                .eq("id", comp.ingredient_id)
                .single();

              const qty = comp.hoeveelheid * item.hoeveelheid;
              await wasteMutation.mutateAsync({
                ingredient_id: comp.ingredient_id,
                hoeveelheid: qty,
                eenheid: comp.eenheid,
                categorie: "personeelsmaaltijd",
                geschatte_kosten: ingData?.kostprijs ? Math.round(qty * ingData.kostprijs * 100) / 100 : null,
              });
              totalIngredients++;
            }
          }
        }
      }

      nestoToast.success(
        "Personeelsmaaltijd geregistreerd",
        `${totalIngredients} ingrediënt${totalIngredients !== 1 ? "en" : ""} afgeschreven`
      );
      resetAndClose();
    } catch {
      nestoToast.error("Kon personeelsmaaltijd niet registreren");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestMeal = async () => {
    setAiLoading(true);
    setAiAttempts((p) => p + 1);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-staff-meal", {
        body: {
          location_id: currentLocation?.id,
          bijna_verlopen: bijnaVerlopen.map((i) => ({
            naam: i.productnaam,
            hoeveelheid: i.geschatte_hoeveelheid,
            dagen_resterend: i.dagen_resterend,
          })),
          overstocked: overstocked.map((i) => ({
            naam: i.naam,
            hoeveelheid: `${i.hoeveelheid} ${i.eenheid}`,
          })),
          aantal_personen: aantalPersonen,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiSuggestion(data);
    } catch {
      nestoToast.error("Kon geen suggestie ophalen");
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseSuggestion = async () => {
    if (!aiSuggestion?.ingredienten || !currentLocation?.id) return;
    const matched = await matchSuggestieToItems(aiSuggestion.ingredienten, currentLocation.id);
    setItems(matched.map((m) => ({
      id: m.id,
      type: m.type,
      naam: m.naam,
      hoeveelheid: m.hoeveelheid,
      eenheid: m.eenheid,
      kostprijs: m.kostprijs,
      receptId: m.receptId,
      ingredientId: m.ingredientId,
    })));
    setAiSuggestion(null);
  };

  const resetAndClose = () => {
    setAantalPersonen(1);
    setItems([]);
    setSelectedMedewerkerIds([]);
    setSearchMain("");
    setSearchGerecht("");
    setSearchSchatting("");
    setGerechtOpen(false);
    setSchattingOpen(false);
    setAiSuggestion(null);
    setAiAttempts(0);
    onOpenChange(false);
  };

  const toggleMedewerker = (id: string) => {
    setSelectedMedewerkerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllMedewerkers = () => {
    if (selectedMedewerkerIds.length === medewerkers.length) {
      setSelectedMedewerkerIds([]);
    } else {
      setSelectedMedewerkerIds(medewerkers.map((m) => m.id));
    }
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={(o) => { if (!o) resetAndClose(); }}
      title="Personeelsmaaltijd"
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Wie heeft gegeten? */}
        <div>
          <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
            {hasMedewerkers ? "Wie heeft gegeten?" : "Aantal personen"}
          </label>
          {hasMedewerkers ? (
            <div className="space-y-1.5">
              {medewerkers.map((m) => (
                <label key={m.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 cursor-pointer">
                  <Checkbox
                    checked={selectedMedewerkerIds.includes(m.id)}
                    onCheckedChange={() => toggleMedewerker(m.id)}
                  />
                  <span className="text-sm">{m.naam}</span>
                  {m.rol && <span className="text-[11px] text-muted-foreground">({m.rol})</span>}
                </label>
              ))}
              <button
                onClick={toggleAllMedewerkers}
                className="text-xs text-primary hover:underline mt-1"
              >
                {selectedMedewerkerIds.length === medewerkers.length ? "Geen" : "Alle"}
              </button>
              {selectedMedewerkerIds.length > 0 && (
                <p className="text-xs text-muted-foreground">→ {selectedMedewerkerIds.length} personen</p>
              )}
            </div>
          ) : (
            <div>
              <NestoInput
                type="number"
                min={1}
                value={aantalPersonen}
                onChange={(e) => { const v = e.target.value; if (v === "") return; setAantalPersonen(parseInt(v, 10) || 1); }}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">
                <a href="/instellingen/keuken/medewerkers" className="text-primary hover:underline">Voeg medewerkers toe</a> om namen te selecteren.
              </p>
            </div>
          )}
        </div>

        {/* AI suggestion banner */}
        {hasRelevantItems && !aiSuggestion && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">
              💡 {bijnaVerlopen.length > 0 && `${bijnaVerlopen.length} item${bijnaVerlopen.length > 1 ? "s" : ""} verloop${bijnaVerlopen.length > 1 ? "en" : "t"} binnenkort`}
              {bijnaVerlopen.length > 0 && overstocked.length > 0 && " · "}
              {overstocked.length > 0 && `${overstocked.length} overstocked`}
            </p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {bijnaVerlopen.slice(0, 3).map((i) => (
                <p key={i.id}>{i.productnaam} ({i.geschatte_hoeveelheid}, {i.dagen_resterend === 0 ? "vandaag" : i.dagen_resterend === 1 ? "morgen" : `over ${i.dagen_resterend} dagen`})</p>
              ))}
              {overstocked.slice(0, 2).map((i) => (
                <p key={i.id} className="text-blue-400">{i.naam} ({i.hoeveelheid} {i.eenheid}, {i.ratio}× weekverbruik)</p>
              ))}
            </div>
            <NestoButton size="sm" variant="outline" onClick={handleSuggestMeal} isLoading={aiLoading} disabled={aiLoading}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Stel maaltijd voor
            </NestoButton>
          </div>
        )}

        {aiSuggestion && !aiSuggestion.geen_voorstel && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">💡 {aiSuggestion.naam}</p>
            <p className="text-xs text-muted-foreground">{aiSuggestion.beschrijving}</p>
            {aiSuggestion.bereidingstijd_min && (
              <p className="text-xs text-muted-foreground">⏱ ~{aiSuggestion.bereidingstijd_min} min</p>
            )}
            <div className="flex gap-2">
              <NestoButton size="sm" onClick={handleUseSuggestion}>Gebruiken</NestoButton>
              {aiAttempts < 3 && (
                <NestoButton size="sm" variant="outline" onClick={handleSuggestMeal} isLoading={aiLoading}>
                  Ander voorstel
                </NestoButton>
              )}
              <NestoButton size="sm" variant="ghost" onClick={() => setAiSuggestion(null)}>Handmatig</NestoButton>
            </div>
          </div>
        )}

        {aiSuggestion?.geen_voorstel && (
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              {aiSuggestion.reden || "Helaas geen goed voorstel mogelijk met de huidige ingrediënten."}
            </p>
            <NestoButton size="sm" variant="ghost" onClick={() => setAiSuggestion(null)} className="mt-2">Handmatig samenstellen</NestoButton>
          </div>
        )}

        {/* Section 1: Search halffabricaat / ingredient */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-[13px] font-medium text-muted-foreground">
              Wat gegeten?
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Zoek een halffabricaat (bijv. Kippensoep) of ingrediënt (bijv. Rijst).
                  Bij halffabricaten zie je automatisch hoeveel gram 1 portie is en
                  welke ingrediënten van de voorraad worden afgeschreven.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <NestoInput
              placeholder="Zoek halffabricaat of ingrediënt..."
              value={searchMain}
              onChange={(e) => setSearchMain(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            {showMainDropdown && (
              <SearchDropdown
                halffabricaten={hfResults}
                ingredienten={igResultsMain}
                onSelectHf={addHalffabricaat}
                onSelectIng={addIngredientManual}
              />
            )}
          </div>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-1">
            {items.map((item) => {
              // Calculate portieFractie for breakdown display
              let breakdownMultiplier = item.hoeveelheid;
              if (item.type === "halffabricaat" && item.eenheid !== "portie" && item.methodeOutputHoeveelheid && item.receptPorties) {
                const portieGrootte = item.methodeOutputHoeveelheid / item.receptPorties;
                const inMethodeEenheid = converteerNaarMethodeEenheid(
                  item.hoeveelheid,
                  item.eenheid,
                  item.methodeOutputEenheid ?? "g"
                );
                breakdownMultiplier = inMethodeEenheid / portieGrootte;
              }

              return (
                <div key={item.id}>
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">
                      {item.naam}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isAuto && (
                        <span className="text-[11px] text-muted-foreground">(auto)</span>
                      )}
                      <span className="text-muted-foreground">×</span>
                      <input
                        type="number"
                        min={item.type === "halffabricaat" && item.eenheid === "portie" ? 1 : 0.1}
                        step={item.type === "halffabricaat" && item.eenheid === "portie" ? 1 : 0.5}
                        value={item.hoeveelheid}
                        onChange={(e) =>
                          updateItemHoeveelheid(item.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-16 text-sm text-right bg-transparent border border-border/50 rounded px-1.5 py-0.5"
                      />
                      {item.type === "halffabricaat" ? (
                        <select
                          value={item.eenheid}
                          onChange={(e) => updateItemEenheid(item.id, e.target.value)}
                          className="text-xs text-muted-foreground bg-transparent border border-border/50 rounded px-1 py-0.5 w-auto"
                        >
                          <option value="portie">portie{item.portieDisplay ? ` (${item.portieDisplay})` : ""}</option>
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground w-12">{item.eenheid}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {item.type === "halffabricaat" && item.breakdownLoading && (
                    <div className="pl-6 pb-1 pt-0.5">
                      <Skeleton className="h-3 w-48" />
                    </div>
                  )}
                  {item.type === "halffabricaat" && item.breakdown && item.breakdown.length > 0 && (
                    <div className="pl-6 pb-1 pt-0.5 text-xs text-muted-foreground">
                      ↳{" "}
                      {item.breakdown.slice(0, 3).map((b, i) => (
                        <span key={i}>
                          {i > 0 && " · "}
                          {(b.hoeveelheidPerPortie * breakdownMultiplier).toFixed(2)} {b.eenheid} {b.naam}
                        </span>
                      ))}
                      {item.breakdown.length > 3 && ` · +${item.breakdown.length - 3} meer`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Separator */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex-1 border-t border-border/50" />
          <span className="text-xs">of</span>
          <div className="flex-1 border-t border-border/50" />
        </div>

        {/* Section 2: Gerecht van de kaart (collapsible) */}
        <div>
          <button
            onClick={() => setGerechtOpen(!gerechtOpen)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {gerechtOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Gerecht van de kaart
          </button>
          {gerechtOpen && (
            <div className="mt-2 relative">
              <NestoInput
                placeholder="Zoek gerecht..."
                value={searchGerecht}
                onChange={(e) => setSearchGerecht(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              {showGerechtDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {gerechtResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</div>
                  ) : (
                    gerechtResults.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => addGerecht(g)}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium">{g.naam}</span>
                        <span className="text-xs text-muted-foreground">{g.categorie}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Schatting (collapsible) */}
        <div>
          <button
            onClick={() => setSchattingOpen(!schattingOpen)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {schattingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Schatting
          </button>
          {schattingOpen && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Op basis van {aantalPersonen} personen — hoeveelheden zijn bewerkbaar
              </p>
              <div className="relative">
                <NestoInput
                  placeholder="Zoek ingrediënt..."
                  value={searchSchatting}
                  onChange={(e) => setSearchSchatting(e.target.value)}
                  leftIcon={<Search className="h-4 w-4" />}
                />
                {showSchattingDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {igResultsSchatting.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</div>
                    ) : (
                      igResultsSchatting.map((ig) => {
                        const portie = getPortieVoorPersonen(ig.categorie, aantalPersonen);
                        return (
                          <button
                            key={ig.id}
                            onClick={() => addIngredientSchatting(ig)}
                            className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
                          >
                            <span className="font-medium">{ig.naam}</span>
                            <span className="text-xs text-muted-foreground">
                              ~{portie.hoeveelheid} {portie.eenheid}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4">
          <NestoButton variant="outline" onClick={resetAndClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSubmit}
            disabled={items.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Registreren..." : "Registreren"}
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}

// Shared search dropdown for section 1
function SearchDropdown({
  halffabricaten,
  ingredienten,
  onSelectHf,
  onSelectIng,
}: {
  halffabricaten: any[];
  ingredienten: any[];
  onSelectHf: (hf: any) => void;
  onSelectIng: (ig: any) => void;
}) {
  if (halffabricaten.length === 0 && ingredienten.length === 0) {
    return (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg">
        <div className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</div>
      </div>
    );
  }

  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {halffabricaten.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Halffabricaten
          </div>
          {halffabricaten.map((hf) => (
            <button
              key={hf.id}
              onClick={() => onSelectHf(hf)}
              className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm"
            >
              <span className="font-medium">{hf.naam}</span>
            </button>
          ))}
        </>
      )}
      {ingredienten.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            Ingrediënten
          </div>
          {ingredienten.map((ig: any) => (
            <button
              key={ig.id}
              onClick={() => onSelectIng(ig)}
              className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
            >
              <span className="font-medium">{ig.naam}</span>
              <span className="text-xs text-muted-foreground">
                {ig.voorraad ?? 0} {ig.eenheid}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
