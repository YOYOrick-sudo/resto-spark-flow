import * as React from "react";
import { useNavigate } from "react-router-dom";
import { NestoInput } from "@/components/polar";
import { NestoSelect } from "@/components/polar";
import { NestoButton } from "@/components/polar";
import { ConfirmDialog } from "@/components/polar";
import { NestoSelectWithCustom } from "@/components/polar/NestoSelectWithCustom";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import { useCustomEenheden } from "@/hooks/useCustomEenheden";
import { useEenheidConversies, useEenheidConversieMutations } from "@/hooks/useEenheidConversies";
import type { IngredientRow } from "@/hooks/useIngredienten";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Archive, Trash2, Plus } from "lucide-react";

const CATEGORIE_OPTIONS = [
  { value: "groenten", label: "Groenten" },
  { value: "vlees", label: "Vlees" },
  { value: "vis", label: "Vis" },
  { value: "zuivel", label: "Zuivel" },
  { value: "kruiden", label: "Kruiden" },
  { value: "olie", label: "Olie" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

const EENHEID_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "st", label: "st" },
];

const OPSLAG_OPTIONS = [
  { value: "koeling", label: "Koeling" },
  { value: "vriezer", label: "Vriezer" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

interface AlgemeenTabProps {
  ingredient: IngredientRow;
}

export function AlgemeenTab({ ingredient }: AlgemeenTabProps) {
  const navigate = useNavigate();
  const { updateIngredient, archiveIngredient } = useIngredientMutations();
  const { data: customEenheden } = useCustomEenheden();
  const { data: conversies } = useEenheidConversies(ingredient.id);
  const { addConversie, deleteConversie } = useEenheidConversieMutations(ingredient.id);

  const [naam, setNaam] = React.useState(ingredient.naam);
  const [categorie, setCategorie] = React.useState(ingredient.categorie);
  const [eenheid, setEenheid] = React.useState(ingredient.eenheid);
  const [yieldPct, setYieldPct] = React.useState(ingredient.yield_percentage);
  const [btwPercentage, setBtwPercentage] = React.useState(String(ingredient.btw_percentage ?? 9));
  const [opslagType, setOpslagType] = React.useState(ingredient.opslag_type || "");
  const [opslagLocatie, setOpslagLocatie] = React.useState(ingredient.opslag_locatie || "");
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);

  // Conversie form state
  const [convNaam, setConvNaam] = React.useState("");
  const [convFactor, setConvFactor] = React.useState("");
  const [convEenheid, setConvEenheid] = React.useState(ingredient.eenheid);

  React.useEffect(() => {
    setNaam(ingredient.naam);
    setCategorie(ingredient.categorie);
    setEenheid(ingredient.eenheid);
    setYieldPct(ingredient.yield_percentage);
    setBtwPercentage(String(ingredient.btw_percentage ?? 9));
    setOpslagType(ingredient.opslag_type || "");
    setOpslagLocatie(ingredient.opslag_locatie || "");
    setConvEenheid(ingredient.eenheid);
  }, [ingredient]);

  const hasChanges =
    naam !== ingredient.naam ||
    categorie !== ingredient.categorie ||
    eenheid !== ingredient.eenheid ||
    yieldPct !== ingredient.yield_percentage ||
    btwPercentage !== String(ingredient.btw_percentage ?? 9) ||
    opslagType !== (ingredient.opslag_type || "") ||
    opslagLocatie !== (ingredient.opslag_locatie || "");

  const handleSave = () => {
    updateIngredient.mutate({
      id: ingredient.id,
      naam,
      categorie,
      eenheid,
      yield_percentage: yieldPct,
      btw_percentage: Number(btwPercentage),
      opslag_type: opslagType || null,
      opslag_locatie: opslagLocatie || null,
    });
  };

  const handleAddConversie = () => {
    if (!convNaam.trim() || !convFactor || !convEenheid) return;
    addConversie.mutate(
      { van_eenheid: convNaam.trim(), naar_eenheid: convEenheid, factor: parseFloat(convFactor) },
      { onSuccess: () => { setConvNaam(""); setConvFactor(""); } }
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-label text-muted-foreground">Naam</label>
        <NestoInput value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>

      <NestoSelect
        label="Categorie"
        value={categorie}
        onValueChange={setCategorie}
        options={CATEGORIE_OPTIONS}
      />

      <NestoSelectWithCustom
        label="Eenheid"
        value={eenheid}
        onValueChange={setEenheid}
        options={EENHEID_OPTIONS}
        suggestions={customEenheden || []}
      />

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-label text-muted-foreground">Bruikbaar percentage</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex">
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[220px] text-xs">
                Hoeveel % van het ingekochte product is bruikbaar na schoonmaken/snijden
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex">
          <NestoInput
            type="number"
            min={1}
            max={100}
            value={yieldPct}
            onChange={(e) => { const v = e.target.value; if (v === "") return; setYieldPct(Number(v)); }}
            className="rounded-r-none border-r-0"
          />
          <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-r-[var(--radius-button)] border-[1.5px] border-l-0 border-border">
            %
          </span>
        </div>
      </div>

      <NestoSelect
        label="BTW percentage"
        value={btwPercentage}
        onValueChange={setBtwPercentage}
        options={[
          { value: "9", label: "9%" },
          { value: "21", label: "21%" },
          { value: "0", label: "0%" },
        ]}
      />

      <NestoSelect
        label="Opslag type"
        value={opslagType}
        onValueChange={setOpslagType}
        options={OPSLAG_OPTIONS}
        placeholder="Selecteer..."
      />

      <div>
        <label className="mb-2 block text-label text-muted-foreground">Opslag locatie</label>
        <NestoInput
          value={opslagLocatie}
          onChange={(e) => setOpslagLocatie(e.target.value)}
          placeholder="bijv. Koeling 2, Schap 3"
        />
      </div>

      {hasChanges && (
        <NestoButton
          onClick={handleSave}
          isLoading={updateIngredient.isPending}
          className="w-full"
        >
          Opslaan
        </NestoButton>
      )}

      {/* Eigen eenheid koppelen */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 mb-3">
          <label className="text-label text-muted-foreground font-medium">Eigen eenheid koppelen</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex">
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[240px] text-xs">
                Definieer eigen eenheden zoals "zwarte bak" en koppel ze aan standaard eenheden voor omrekening.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Bestaande conversies */}
        {conversies && conversies.length > 0 && (
          <div className="space-y-2 mb-3">
            {conversies.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <span className="text-sm">
                  1 <span className="font-medium">{c.van_eenheid}</span> = {c.factor} {c.naar_eenheid}
                </span>
                <button
                  onClick={() => deleteConversie.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Nieuwe conversie toevoegen */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <NestoInput
              value={convNaam}
              onChange={(e) => setConvNaam(e.target.value)}
              placeholder="bijv. zwarte bak"
              className="h-10"
            />
          </div>
          <span className="text-sm text-muted-foreground pb-2.5">=</span>
          <div className="w-20">
            <NestoInput
              type="number"
              step="0.1"
              value={convFactor}
              onChange={(e) => setConvFactor(e.target.value)}
              placeholder="2.5"
              className="h-10"
            />
          </div>
          <div className="w-20">
            <NestoSelect
              value={convEenheid}
              onValueChange={setConvEenheid}
              options={EENHEID_OPTIONS}
              size="sm"
            />
          </div>
          <NestoButton
            variant="outline"
            onClick={handleAddConversie}
            disabled={!convNaam.trim() || !convFactor || addConversie.isPending}
            className="h-10 px-3"
          >
            <Plus className="h-4 w-4" />
          </NestoButton>
        </div>
      </div>

      <div className="pt-4 border-t border-border/50">
        <NestoButton
          variant="outline"
          onClick={() => setShowArchiveConfirm(true)}
          className="w-full text-muted-foreground"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archiveren
        </NestoButton>
      </div>

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Ingrediënt archiveren?"
        description="Het ingrediënt wordt verborgen uit het overzicht maar niet verwijderd."
        confirmLabel="Archiveren"
        variant="destructive"
        onConfirm={() => {
          archiveIngredient.mutate(ingredient.id, {
            onSuccess: () => navigate("/voorraad"),
          });
        }}
      />
    </div>
  );
}
