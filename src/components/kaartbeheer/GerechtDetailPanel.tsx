import { useState, useEffect } from "react";
import { NestoPanel, NestoTabs, NestoTabContent, NestoButton, NestoSelect, NestoBadge, Spinner } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGerechtDetail } from "@/hooks/useGerechtDetail";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";
import { GerechtComponentenTab } from "./GerechtComponentenTab";
import { GerechtAllergenenTab } from "./GerechtAllergenenTab";

const DEFAULT_CATS = ["Voorgerechten", "Hoofdgerechten", "Desserts", "Bijgerechten", "Dranken", "Overig"];

const tabs = [
  { id: "algemeen", label: "Algemeen" },
  { id: "componenten", label: "Componenten" },
  { id: "allergenen", label: "Allergenen" },
];

function AlgemeenTab({ gerecht }: { gerecht: NonNullable<ReturnType<typeof useGerechtDetail>["data"]> }) {
  const { updateGerecht, archiveerGerecht } = useGerechtMutations();
  const { data: settings } = useKeukenSettings();
  const [naam, setNaam] = useState(gerecht.naam);
  const [categorie, setCategorie] = useState(gerecht.categorie);
  const [beschrijving, setBeschrijving] = useState(gerecht.beschrijving ?? "");
  const [verkoopprijs, setVerkoopprijs] = useState(gerecht.verkoopprijs?.toString() ?? "");

  useEffect(() => {
    setNaam(gerecht.naam);
    setCategorie(gerecht.categorie);
    setBeschrijving(gerecht.beschrijving ?? "");
    setVerkoopprijs(gerecht.verkoopprijs?.toString() ?? "");
  }, [gerecht.id, gerecht.naam, gerecht.categorie, gerecht.beschrijving, gerecht.verkoopprijs]);

  const cats = ((settings as any)?.gerecht_categorieen as string[] | undefined) ?? DEFAULT_CATS;
  const catOptions = cats.map((c) => ({ value: c, label: c }));

  const handleSave = () => {
    updateGerecht.mutate({
      id: gerecht.id,
      naam,
      categorie,
      beschrijving: beschrijving || null,
      verkoopprijs: verkoopprijs ? parseFloat(verkoopprijs) : null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Naam *</label>
        <Input value={naam} onChange={(e) => setNaam(e.target.value)} className="h-11" />
      </div>
      <NestoSelect label="Categorie" value={categorie} onValueChange={setCategorie} options={catOptions} />
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Beschrijving</label>
        <Textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} rows={3} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Verkoopprijs (€)</label>
        <Input type="number" step="0.01" value={verkoopprijs} onChange={(e) => setVerkoopprijs(e.target.value)} className="h-11" />
      </div>

      <div className="grid grid-cols-2 gap-y-1.5 text-sm rounded-xl border border-border/30 bg-muted/20 p-3">
        <span className="text-muted-foreground">Kostprijs</span>
        <span className="text-right font-medium">€{gerecht.kostprijs.toFixed(2)}</span>
        <span className="text-muted-foreground">Marge</span>
        <span className="text-right">
          {gerecht.marge_percentage != null ? (
            <NestoBadge
              variant={gerecht.marge_percentage > 65 ? "success" : gerecht.marge_percentage >= 55 ? "warning" : "error"}
              size="sm"
            >
              {gerecht.marge_percentage.toFixed(1)}%
            </NestoBadge>
          ) : (
            "—"
          )}
        </span>
      </div>

      <NestoButton onClick={handleSave} isLoading={updateGerecht.isPending} className="w-full min-h-[44px]">
        Opslaan
      </NestoButton>

      {!gerecht.is_archived && (
        <NestoButton
          variant="outline"
          onClick={() => archiveerGerecht.mutate(gerecht.id)}
          isLoading={archiveerGerecht.isPending}
          className="w-full min-h-[44px] text-destructive hover:text-destructive"
        >
          Archiveren
        </NestoButton>
      )}
    </div>
  );
}

interface Props {
  gerechtId: string | null;
  onClose: () => void;
  initialTab?: string;
}

export function GerechtDetailPanel({ gerechtId, onClose, initialTab }: Props) {
  const { data: gerecht, isLoading } = useGerechtDetail(gerechtId);
  const [activeTab, setActiveTab] = useState(initialTab ?? "algemeen");

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, gerechtId]);

  if (!gerechtId) return null;

  return (
    <NestoPanel open={!!gerechtId} onClose={onClose} title="Gerecht">
      {(titleRef) => (
        <div className="px-5 py-6 space-y-5">
          {isLoading || !gerecht ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <h2 ref={titleRef} className="text-xl font-semibold">
                {gerecht.naam}
              </h2>

              <NestoTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

              <NestoTabContent value="algemeen" activeValue={activeTab}>
                <AlgemeenTab gerecht={gerecht} />
              </NestoTabContent>

              <NestoTabContent value="componenten" activeValue={activeTab}>
                <GerechtComponentenTab gerecht={gerecht} />
              </NestoTabContent>

              <NestoTabContent value="allergenen" activeValue={activeTab}>
                <GerechtAllergenenTab gerechtId={gerecht.id} />
              </NestoTabContent>
            </>
          )}
        </div>
      )}
    </NestoPanel>
  );
}
