import { useNavigate } from "react-router-dom";
import { StepWizard, type WizardStep } from "@/components/polar/StepWizard";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { nestoToast } from "@/lib/nestoToast";
import { ReceptStapBasis } from "@/components/recepten/wizard/ReceptStapBasis";
import { ReceptStapIngredienten } from "@/components/recepten/wizard/ReceptStapIngredienten";
import { ReceptStapBereiding } from "@/components/recepten/wizard/ReceptStapBereiding";
import { ReceptStapMethodes } from "@/components/recepten/wizard/ReceptStapMethodes";
import { ReceptStapBevestigen } from "@/components/recepten/wizard/ReceptStapBevestigen";

const steps: WizardStep[] = [
  {
    id: "basis",
    title: "Wat ga je bereiden?",
    subtitle: "Geef de basisinformatie van je recept op.",
    component: <ReceptStapBasis />,
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
  {
    id: "methodes",
    title: "Welke bereidingsmethodes heeft dit halffabricaat?",
    subtitle: "Een halffabricaat kan op meerdere manieren worden bereid of aangevuld.",
    component: <ReceptStapMethodes />,
    isOptional: true,
  },
  {
    id: "bevestigen",
    title: "Controleer en bevestig",
    subtitle: "Bekijk de samenvatting en allergenen.",
    component: <ReceptStapBevestigen />,
  },
];

export default function ReceptenNieuw() {
  const navigate = useNavigate();
  const { createRecept, addIngredient, addMethode } = useReceptMutations();

  const handleComplete = async (formData: Record<string, any>) => {
    try {
      const id = await createRecept.mutateAsync({
        naam: formData.basis.naam.trim(),
        categorie: formData.basis.categorie,
        type: "halffabricaat",
        porties: formData.basis.porties,
        actieve_bereidingstijd: formData.basis.actieve_bereidingstijd || null,
        passieve_bereidingstijd: formData.basis.passieve_bereidingstijd || null,
        bereiding: formData.bereiding?.html || null,
      });

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

      nestoToast.success(`Halffabricaat "${formData.basis.naam}" aangemaakt!`);
      navigate(`/recepten/${id}`);
    } catch (error) {
      nestoToast.error("Er ging iets mis bij het opslaan. Probeer het opnieuw.");
      console.error("Recept creation failed:", error);
      throw error;
    }
  };

  return (
    <StepWizard
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => navigate("/recepten")}
      backLink="/recepten"
      backLabel="Recepten"
    />
  );
}
