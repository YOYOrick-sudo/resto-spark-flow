import { useNavigate } from "react-router-dom";
import { StepWizard, type WizardStep } from "@/components/polar/StepWizard";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";
import { GerechtStapBasis } from "@/components/kaartbeheer/wizard/GerechtStapBasis";
import { GerechtStapRecepten } from "@/components/kaartbeheer/wizard/GerechtStapRecepten";
import { GerechtStapBereiding } from "@/components/kaartbeheer/wizard/GerechtStapBereiding";
import { GerechtStapPrijs } from "@/components/kaartbeheer/wizard/GerechtStapPrijs";
import { GerechtStapBevestigen } from "@/components/kaartbeheer/wizard/GerechtStapBevestigen";

export default function KaartbeheerNieuw() {
  const navigate = useNavigate();
  const { createGerecht, addComponent } = useGerechtMutations();
  const { currentLocation, hasModule } = useUserContext();

  if (!hasModule("kitchen")) {
    navigate("/");
    return null;
  }

  const steps: WizardStep[] = [
    {
      id: "basis",
      title: "Wat is het gerecht?",
      subtitle: "Geef de basisinformatie van je gerecht op.",
      component: <GerechtStapBasis />,
      validate: (data) => {
        if (!data.basis?.naam?.trim()) return "Vul een naam in.";
        if (!data.basis?.categorie) return "Kies een categorie.";
        return null;
      },
    },
    {
      id: "recepten",
      title: "Welke recepten zitten in dit gerecht?",
      subtitle: "Koppel de halffabricaten en recepten die samen dit gerecht vormen.",
      component: <GerechtStapRecepten />,
      isOptional: true,
    },
    {
      id: "bereidingswijze",
      title: "Hoe wordt dit gerecht opgemaakt?",
      subtitle: "Beschrijf hoe de kok het gerecht assembleert uit de halffabricaten.",
      component: <GerechtStapBereiding />,
      isOptional: true,
    },
    {
      id: "prijs",
      title: "Wat kost dit gerecht?",
      subtitle: "Stel de verkoopprijs in en bekijk je marge.",
      component: <GerechtStapPrijs />,
      isOptional: true,
    },
    {
      id: "bevestigen",
      title: "Controleer en bevestig",
      subtitle: "Bekijk de samenvatting en de allergenen van je gerecht.",
      component: <GerechtStapBevestigen />,
    },
  ];

  const handleComplete = async (formData: Record<string, any>) => {
    if (!currentLocation?.id) {
      nestoToast.error("Geen locatie geselecteerd");
      return;
    }

    try {
      const gerecht = await createGerecht.mutateAsync({
        naam: formData.basis.naam.trim(),
        categorie: formData.basis.categorie,
        omschrijving: formData.basis?.omschrijving || null,
        bereidingswijze: formData.bereidingswijze?.html || null,
        verkoopprijs: formData.prijs?.verkoopprijs
          ? parseFloat(formData.prijs.verkoopprijs)
          : undefined,
        foto_url: formData.prijs?.foto_url || null,
      });

      // Link recipes in parallel
      const recepten = formData.recepten?.items ?? [];
      if (recepten.length > 0) {
        await Promise.all(
          recepten.map((r: any) =>
            addComponent.mutateAsync({
              gerecht_id: gerecht.id,
              type: "halffabricaat",
              recept_id: r.id,
              hoeveelheid: r.hoeveelheid,
              eenheid: r.eenheid,
            })
          )
        );
      }

      nestoToast.success(`Gerecht "${formData.basis.naam}" aangemaakt!`);
      navigate(`/kaartbeheer/${gerecht.id}`);
    } catch (error) {
      nestoToast.error("Er ging iets mis bij het opslaan. Probeer het opnieuw.");
      console.error("Gerecht creation failed:", error);
      throw error; // Keep wizard open
    }
  };

  return (
    <StepWizard
      steps={steps}
      onComplete={handleComplete}
      onCancel={() => navigate("/kaartbeheer")}
      backLink="/kaartbeheer"
      backLabel="Kaartbeheer"
    />
  );
}
