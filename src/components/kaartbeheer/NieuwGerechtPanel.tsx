import { useState } from "react";
import { NestoPanel, NestoButton, NestoSelect } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";

const DEFAULT_CATS = ["Voorgerechten", "Hoofdgerechten", "Desserts", "Bijgerechten", "Dranken", "Overig"];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function NieuwGerechtPanel({ open, onClose, onCreated }: Props) {
  const { createGerecht } = useGerechtMutations();
  const { data: settings } = useKeukenSettings();
  const [naam, setNaam] = useState("");
  const [categorie, setCategorie] = useState("Hoofdgerechten");
  const [verkoopprijs, setVerkoopprijs] = useState("");

  const cats = ((settings as any)?.gerecht_categorieen as string[] | undefined) ?? DEFAULT_CATS;
  const catOptions = cats.map((c) => ({ value: c, label: c }));

  const handleCreate = () => {
    if (!naam.trim()) return;
    createGerecht.mutate(
      {
        naam: naam.trim(),
        categorie,
        verkoopprijs: verkoopprijs ? parseFloat(verkoopprijs) : undefined,
      },
      {
        onSuccess: (data) => {
          setNaam("");
          setCategorie("Hoofdgerechten");
          setVerkoopprijs("");
          onClose();
          onCreated(data.id);
        },
      }
    );
  };

  if (!open) return null;

  return (
    <NestoPanel open={open} onClose={onClose} title="Nieuw gerecht">
      {(titleRef) => (
        <div className="px-5 py-6 space-y-5">
          <h2 ref={titleRef} className="text-xl font-semibold">
            Nieuw gerecht
          </h2>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Naam *</label>
            <Input
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="h-11"
              placeholder="Bijv. Clubsandwich"
              autoFocus
            />
          </div>

          <NestoSelect label="Categorie" value={categorie} onValueChange={setCategorie} options={catOptions} />

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Verkoopprijs (€, optioneel)</label>
            <Input
              type="number"
              step="0.01"
              value={verkoopprijs}
              onChange={(e) => setVerkoopprijs(e.target.value)}
              className="h-11"
            />
          </div>

          <NestoButton
            onClick={handleCreate}
            disabled={!naam.trim()}
            isLoading={createGerecht.isPending}
            className="w-full min-h-[44px]"
          >
            Gerecht aanmaken
          </NestoButton>
        </div>
      )}
    </NestoPanel>
  );
}
