import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/polar";
import { Settings, Database, Loader2, CheckCircle2 } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoCard } from "@/components/polar/NestoCard";
import { useUserContext } from "@/contexts/UserContext";
import { seedDemoData } from "@/lib/seedDemoData";
import { nestoToast } from "@/lib/nestoToast";

export default function SettingsVoorkeuren() {
  const { currentLocation } = useUserContext();
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const handleSeed = async () => {
    if (!currentLocation?.id) {
      nestoToast.error("Geen locatie geselecteerd");
      return;
    }
    setSeeding(true);
    const result = await seedDemoData(currentLocation.id);
    setSeeding(false);

    if (result.success) {
      setSeedDone(true);
      nestoToast.success(result.message, result.created
        ? `${result.created.ingredienten} ingrediënten, ${result.created.recepten} recepten, ${result.created.gerechten} gerechten`
        : undefined
      );
    } else {
      nestoToast.error(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Voorkeuren" subtitle="Algemene app voorkeuren en instellingen." />

      {/* Developer section */}
      <NestoCard className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Ontwikkelaar</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Vul het systeem met realistische testdata (leveranciers, ingrediënten, recepten, gerechten, MEP taken en voorraad).
        </p>
        <NestoButton
          onClick={handleSeed}
          disabled={seeding || seedDone}
          variant={seedDone ? "outline" : "primary"}
          size="sm"
        >
          {seeding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {seedDone && <CheckCircle2 className="h-4 w-4 mr-2" />}
          {seeding ? "Bezig met laden..." : seedDone ? "Demo data geladen" : "Demo data laden"}
        </NestoButton>
      </NestoCard>

      <EmptyState
        icon={Settings}
        title="Configuratie volgt binnenkort"
        description="Deze instellingen worden in een volgende versie beschikbaar."
      />
    </div>
  );
}
