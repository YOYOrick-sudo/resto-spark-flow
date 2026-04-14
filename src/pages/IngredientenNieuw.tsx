import * as React from "react";
import { useNavigate } from "react-router-dom";
import { StepWizard, type WizardStep } from "@/components/polar/StepWizard";
import { IngredientStapBasis } from "@/components/ingredienten/wizard/IngredientStapBasis";
import { IngredientStapVoorraadPrijs } from "@/components/ingredienten/wizard/IngredientStapVoorraadPrijs";
import { IngredientStapAllergenen } from "@/components/ingredienten/wizard/IngredientStapAllergenen";
import { IngredientStapBevestigen } from "@/components/ingredienten/wizard/IngredientStapBevestigen";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import { useAllergenen } from "@/hooks/useIngredienten";
import { nestoToast } from "@/lib/nestoToast";

export default function IngredientenNieuw() {
  const navigate = useNavigate();
  const { createIngredient, upsertAllergeenStatus } = useIngredientMutations();
  const { data: allergenenRef } = useAllergenen();

  const steps: WizardStep[] = [
    {
      id: "basis",
      title: "Basis",
      subtitle: "Geef de basisinformatie op.",
      component: <IngredientStapBasis />,
      validate: (data) => {
        const b = data.basis;
        if (!b?.naam?.trim()) return "Vul een naam in.";
        if (!b?.categorie) return "Kies een categorie.";
        if (!b?.eenheid) return "Kies een eenheid.";
        return null;
      },
    },
    {
      id: "voorraad_prijs",
      title: "Prijs & Voorraad",
      subtitle: "Stel de inkoopprijs en voorraadniveaus in.",
      component: <IngredientStapVoorraadPrijs />,
      isOptional: true,
    },
    {
      id: "allergenen",
      title: "Allergenen",
      subtitle: "Geef aan welke allergenen dit ingrediënt bevat.",
      component: <IngredientStapAllergenen />,
      isOptional: true,
    },
    {
      id: "bevestigen",
      title: "Bevestigen",
      subtitle: "Bekijk de samenvatting van je ingrediënt.",
      component: <IngredientStapBevestigen />,
    },
  ];

  const handleComplete = async (formData: Record<string, any>) => {
    const basis = formData.basis ?? {};
    const voorraad = formData.voorraad_prijs ?? {};
    const allergenen = formData.allergenen ?? {};

    try {
      const id = await createIngredient.mutateAsync({
        naam: basis.naam.trim(),
        categorie: basis.categorie,
        eenheid: basis.eenheid,
        yield_percentage: voorraad.yield_percentage ?? 100,
        opslag_type: basis.opslag_type || null,
        opslag_locatie: null,
        ...(voorraad.kostprijs
          ? {
              kostprijs: Number(voorraad.kostprijs),
              kostprijs_bron: "handmatig",
              kostprijs_laatst_bijgewerkt: new Date().toISOString(),
            }
          : {}),
      });

      // Update allergen statuses that differ from "onbekend"
      if (allergenenRef) {
        const changed = allergenenRef
          .filter((a) => allergenen[a.id] && allergenen[a.id] !== "onbekend")
          .map((a) => ({
            ingredientId: id,
            allergeenId: a.id,
            status: allergenen[a.id],
          }));

        if (changed.length > 0) {
          await Promise.all(
            changed.map((c) => upsertAllergeenStatus.mutateAsync(c))
          );
        }
      }

      nestoToast.success(`Ingrediënt "${basis.naam.trim()}" aangemaakt!`);
      navigate("/voorraad");
    } catch {
      nestoToast.error("Er ging iets mis bij het opslaan. Probeer het opnieuw.");
    }
  };

  return (
    <StepWizard
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => navigate("/voorraad")}
      backLink="/voorraad"
      backLabel="Ingrediënten"
    />
  );
}
