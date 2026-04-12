import * as React from "react";
import { NestoPanel } from "@/components/polar";
import { NestoTabs, NestoTabContent } from "@/components/polar";
import { useIngredient } from "@/hooks/useIngredient";
import { Spinner } from "@/components/polar";
import { AlgemeenTab } from "./tabs/AlgemeenTab";
import { VoorraadTab } from "./tabs/VoorraadTab";
import { KostprijsTab } from "./tabs/KostprijsTab";
import { LeveranciersTab } from "./tabs/LeveranciersTab";
import { AllergenenTab } from "./tabs/AllergenenTab";

const TABS = [
  { id: "algemeen", label: "Algemeen" },
  { id: "voorraad", label: "Voorraad" },
  { id: "kostprijs", label: "Kostprijs" },
  { id: "leveranciers", label: "Leveranciers" },
  { id: "allergenen", label: "Allergenen" },
];

interface IngredientDetailPanelProps {
  ingredientId: string | null;
  open: boolean;
  onClose: () => void;
}

export function IngredientDetailPanel({ ingredientId, open, onClose }: IngredientDetailPanelProps) {
  const [activeTab, setActiveTab] = React.useState("algemeen");
  const { data: ingredient, isLoading } = useIngredient(ingredientId);

  // Reset tab when opening new ingredient
  React.useEffect(() => {
    if (ingredientId) setActiveTab("algemeen");
  }, [ingredientId]);

  return (
    <NestoPanel
      open={open}
      onClose={onClose}
      title="Ingrediënt"
    >
      {(titleRef) => (
        <div className="px-5 py-5">
          {isLoading || !ingredient ? (
            <Spinner className="mx-auto mt-12" />
          ) : (
            <>
              <h2 ref={titleRef} className="text-h2 text-foreground mb-4">
                {ingredient.naam}
              </h2>

              <NestoTabs
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                className="mb-0"
              />

              <div className="pt-5">
                <NestoTabContent value="algemeen" activeValue={activeTab}>
                  <AlgemeenTab ingredient={ingredient} onClose={onClose} />
                </NestoTabContent>
                <NestoTabContent value="voorraad" activeValue={activeTab}>
                  <VoorraadTab ingredient={ingredient} />
                </NestoTabContent>
                <NestoTabContent value="kostprijs" activeValue={activeTab}>
                  <KostprijsTab ingredient={ingredient} />
                </NestoTabContent>
                <NestoTabContent value="leveranciers" activeValue={activeTab}>
                  <LeveranciersTab />
                </NestoTabContent>
                <NestoTabContent value="allergenen" activeValue={activeTab}>
                  <AllergenenTab ingredient={ingredient} />
                </NestoTabContent>
              </div>
            </>
          )}
        </div>
      )}
    </NestoPanel>
  );
}
