import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useIngredient } from "@/hooks/useIngredient";
import { getVoorraadStatus } from "@/hooks/useIngredienten";
import {
  NestoTabs, NestoTabContent, NestoButton, NestoBadge, Spinner,
} from "@/components/polar";
import { AllergeenPills } from "@/components/polar/AllergeenPills";
import { AlgemeenTab } from "@/components/ingredienten/tabs/AlgemeenTab";
import { VoorraadTab } from "@/components/ingredienten/tabs/VoorraadTab";
import { KostprijsTab } from "@/components/ingredienten/tabs/KostprijsTab";
import { LeveranciersTab } from "@/components/ingredienten/tabs/LeveranciersTab";
import { AllergenenTab } from "@/components/ingredienten/tabs/AllergenenTab";
import { ChevronLeft } from "lucide-react";
import { fmtEuroPrecise } from "@/lib/format";

const TABS = [
  { id: "algemeen", label: "Algemeen" },
  { id: "voorraad", label: "Voorraad" },
  { id: "kostprijs", label: "Kostprijs" },
  { id: "leveranciers", label: "Leveranciers" },
  { id: "allergenen", label: "Allergenen" },
];

const STATUS_CONFIG = {
  laag: { variant: "error" as const, label: "Laag" },
  "op-voorraad": { variant: "success" as const, label: "Op voorraad" },
  overschot: { variant: "primary" as const, label: "Overschot" },
};

export default function IngredientenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ingredient, isLoading, error } = useIngredient(id ?? null);
  const [activeTab, setActiveTab] = useState("algemeen");

  const allergeenPills = useMemo(() => {
    if (!ingredient?.ingredient_allergenen) return [];
    return ingredient.ingredient_allergenen
      .filter((a) => a.status === "bevat" || a.status === "kan_bevatten")
      .map((a) => ({
        allergeen_id: a.allergeen_id,
        code: a.allergenen?.code ?? "?",
        naam_nl: a.allergenen?.naam_nl,
        status: a.status as "bevat" | "kan_bevatten",
      }));
  }, [ingredient?.ingredient_allergenen]);

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner /></div>;
  }

  if (error || !ingredient) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Ingrediënt niet gevonden.</p>
        <NestoButton variant="outline" onClick={() => navigate("/voorraad")}>
          Terug naar overzicht
        </NestoButton>
      </div>
    );
  }

  const status = getVoorraadStatus(ingredient.voorraad, ingredient.min_voorraad);
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-6">
      <Link
        to="/voorraad"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Ingrediënten</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Links — tabs */}
        <div className="lg:col-span-3 space-y-5">
          <NestoTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

          <NestoTabContent value="algemeen" activeValue={activeTab}>
            <AlgemeenTab ingredient={ingredient} />
          </NestoTabContent>
          <NestoTabContent value="voorraad" activeValue={activeTab}>
            <VoorraadTab ingredient={ingredient} />
          </NestoTabContent>
          <NestoTabContent value="kostprijs" activeValue={activeTab}>
            <KostprijsTab ingredient={ingredient} />
          </NestoTabContent>
          <NestoTabContent value="leveranciers" activeValue={activeTab}>
            <LeveranciersTab ingredientId={ingredient.id} ingredientEenheid={ingredient.eenheid} />
          </NestoTabContent>
          <NestoTabContent value="allergenen" activeValue={activeTab}>
            <AllergenenTab ingredient={ingredient} />
          </NestoTabContent>
        </div>

        {/* Rechts — sticky sidebar */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold text-foreground truncate">{ingredient.naam}</h2>
            <div className="flex flex-wrap gap-2">
              <NestoBadge variant="default" size="sm">{ingredient.categorie}</NestoBadge>
              <NestoBadge variant="default" size="sm">{ingredient.eenheid}</NestoBadge>
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Voorraad</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg tabular-nums font-medium">
                {ingredient.voorraad} {ingredient.eenheid}
              </span>
              <NestoBadge variant={cfg.variant} size="sm">{cfg.label}</NestoBadge>
            </div>
            <div className="text-xs text-muted-foreground">
              Min: {ingredient.min_voorraad} {ingredient.eenheid}
              {ingredient.max_voorraad != null && ` · Max: ${ingredient.max_voorraad} ${ingredient.eenheid}`}
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kostprijs</h3>
            <div>
              <span className="text-lg font-medium">
                {fmtEuroPrecise(ingredient.kostprijs)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">per {ingredient.eenheid}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allergenen</h3>
            <AllergeenPills allergenen={allergeenPills} showEmpty emptyText="Geen allergenen" />
          </div>
        </div>
      </div>
    </div>
  );
}
