import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { StepWizard, type WizardStep } from "@/components/polar/StepWizard";
import { useStepWizard } from "@/components/polar/StepWizard";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { toast } from "sonner";
import { ReceptStapBasis } from "@/components/recepten/wizard/ReceptStapBasis";
import { ReceptStapIngredienten } from "@/components/recepten/wizard/ReceptStapIngredienten";
import { ReceptStapBereiding } from "@/components/recepten/wizard/ReceptStapBereiding";
import { ReceptStapMethodes } from "@/components/recepten/wizard/ReceptStapMethodes";
import { ReceptStapBevestigen } from "@/components/recepten/wizard/ReceptStapBevestigen";

function ReceptenNieuwInner() {
  const navigate = useNavigate();
  const { createRecept, addIngredient, addMethode } = useReceptMutations();

  // We need formData to determine steps dynamically, but StepWizard manages it.
  // Instead, we build all possible steps and handle the skip via a wrapper.
  // The StepWizard doesn't support dynamic steps after mount easily,
  // so we'll use a stateful wrapper.

  return <ReceptenWizardWithDynamicSteps />;
}

function ReceptenWizardWithDynamicSteps() {
  const navigate = useNavigate();
  const { createRecept, addIngredient, addMethode } = useReceptMutations();

  // We need to track type selection to filter steps
  // Since StepWizard has its own state, we use a key-based re-render approach
  // But actually the simpler approach: always include methodes step, 
  // and in ReceptStapMethodes show a message if type is gerecht.
  // OR: use state here and rebuild steps.

  // Simplest: use local state for type, rebuild steps array
  const { type, setType, steps } = useReceptSteps();

  const handleComplete = async (formData: Record<string, any>) => {
    try {
      const id = await createRecept.mutateAsync({
        naam: formData.basis.naam.trim(),
        categorie: formData.basis.categorie,
        type: formData.basis.type,
        porties: formData.basis.porties,
        actieve_bereidingstijd: formData.basis.actieve_bereidingstijd || null,
        passieve_bereidingstijd: formData.basis.passieve_bereidingstijd || null,
        bereiding: formData.bereiding?.html || null,
      });

      // Add ingredients and methodes in parallel
      const ingredients = formData.ingredienten?.items ?? [];
      const methodes = formData.methodes?.items ?? [];

      const promises: Promise<any>[] = [];

      ingredients.forEach((item: any, i: number) => {
        promises.push(
          addIngredient.mutateAsync({
            receptId: id,
            ingredientId: item.id,
            hoeveelheid: item.hoeveelheid,
            eenheid: item.eenheid,
            sortOrder: i,
          })
        );
      });

      methodes.forEach((m: any, i: number) => {
        promises.push(
          addMethode.mutateAsync({
            receptId: id,
            type: m.type,
            visueleEenheid: m.visueleEenheid || "",
            outputHoeveelheid: m.outputHoeveelheid,
            outputEenheid: m.outputEenheid,
            standaardDuur: m.standaardDuur,
            houdbaarheid: m.houdbaarheid || null,
            instructie: m.instructie || null,
            sortOrder: i,
          })
        );
      });

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      toast.success(`Recept "${formData.basis.naam}" aangemaakt!`);
      navigate(`/recepten/${id}`);
    } catch (error) {
      toast.error("Er ging iets mis bij het opslaan. Probeer het opnieuw.");
      console.error("Recept creation failed:", error);
      throw error; // Keep wizard open
    }
  };

  return (
    <StepWizard
      key={type} // Re-mount when type changes to rebuild steps
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => navigate("/recepten")}
      backLink="/recepten"
      backLabel="Recepten"
    />
  );
}

function useReceptSteps() {
  // We can't use useStepWizard here (outside provider), so we track type via a simple state
  // that the basis step updates via a callback stored in a ref
  const { type, setType } = useReceptTypeState();

  const steps: WizardStep[] = useMemo(() => {
    const base: WizardStep[] = [
      {
        id: "basis",
        title: "Wat ga je bereiden?",
        subtitle: "Geef de basisinformatie van je recept op.",
        component: <ReceptStapBasis onTypeChange={setType} />,
        validate: (data) => {
          if (!data.basis?.naam?.trim()) return "Vul een naam in.";
          if (!data.basis?.categorie) return "Kies een categorie.";
          return null;
        },
      },
      {
        id: "ingredienten",
        title: "Welke ingrediënten heb je nodig?",
        subtitle: "Voeg ingrediënten toe en geef de hoeveelheden op.",
        component: <ReceptStapIngredienten />,
        isOptional: true,
      },
      {
        id: "bereiding",
        title: "Hoe bereid je dit?",
        subtitle: "Beschrijf de bereidingsstappen.",
        component: <ReceptStapBereiding />,
        isOptional: true,
      },
    ];

    if (type === "halffabricaat") {
      base.push({
        id: "methodes",
        title: "Welke bereidingsmethodes heeft dit halffabricaat?",
        subtitle: "Een halffabricaat kan op meerdere manieren worden bereid of aangevuld.",
        component: <ReceptStapMethodes />,
        isOptional: true,
      });
    }

    base.push({
      id: "bevestigen",
      title: "Controleer en bevestig",
      subtitle: "Bekijk de samenvatting en allergenen.",
      component: <ReceptStapBevestigen />,
    });

    return base;
  }, [type, setType]);

  return { type, setType, steps };
}

function useReceptTypeState() {
  const [type, setType] = useState<string>("halffabricaat");
  return { type, setType };
}

// Need useState import
import { useState } from "react";

export default function ReceptenNieuw() {
  return <ReceptenWizardWithDynamicSteps />;
}
