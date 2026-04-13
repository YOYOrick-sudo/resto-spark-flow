import { useState } from "react";
import { NestoButton, NestoBadge, EmptyState, PageHeader } from "@/components/polar";
import { useBesteladvies, AdviesGroep } from "@/hooks/useBesteladvies";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { BesteladviesLeverancierGroep } from "./BesteladviesLeverancierGroep";
import { Sparkles, PackageCheck } from "lucide-react";
import { Spinner } from "@/components/polar";

interface Props {
  onBestellingCreated: () => void;
}

export function BesteladviesTab({ onBestellingCreated }: Props) {
  const { data: groepen, isLoading, refetch, isFetching } = useBesteladvies();
  const mutations = useVoorraadInkoopMutations();
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    refetch();
    setGenerated(true);
  };

  const handleMaakBestellijst = async (groep: AdviesGroep) => {
    if (!groep.leverancier_id) return;
    await mutations.createBestelling.mutateAsync({
      leverancier_id: groep.leverancier_id,
      regels: groep.regels.map((r) => ({
        ingredient_id: r.ingredient_id,
        bestelde_hoeveelheid: r.advies_hoeveelheid,
        eenheid: r.eenheid,
        prijs_per_eenheid: r.prijs_per_verpakking && r.verpakking_hoeveelheid
          ? r.prijs_per_verpakking / r.verpakking_hoeveelheid
          : undefined,
        totaal: r.geschatte_prijs ?? undefined,
        leveranciers_artikel_id: r.artikel_id ?? undefined,
      })),
    });
    onBestellingCreated();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Analyseer ingrediënten onder minimum voorraad en genereer bestellijsten.
        </p>
        <NestoButton
          leftIcon={<Sparkles className="h-4 w-4" />}
          onClick={handleGenerate}
          isLoading={isFetching}
        >
          Genereer besteladvies
        </NestoButton>
      </div>

      {!generated ? (
        <EmptyState
          icon={PackageCheck}
          title="Nog geen advies gegenereerd"
          description="Klik op 'Genereer besteladvies' om ingrediënten onder minimum te analyseren."
        />
      ) : isLoading || isFetching ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !groepen || groepen.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Alle voorraden op peil"
          description="Er zijn geen ingrediënten onder het minimum voorraadniveau."
        />
      ) : (
        <div className="space-y-6">
          {groepen.map((groep) => (
            <BesteladviesLeverancierGroep
              key={groep.leverancier_id ?? "geen"}
              groep={groep}
              onMaakBestellijst={() => handleMaakBestellijst(groep)}
              isCreating={mutations.createBestelling.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
