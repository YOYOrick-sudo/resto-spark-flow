import * as React from "react";
import { NestoModal, NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { useReceptMutations } from "@/hooks/useReceptMutations";

const CATEGORIE_OPTIONS = [
  { value: "sauzen", label: "Sauzen" },
  { value: "bijgerechten", label: "Bijgerechten" },
  { value: "hoofdgerechten", label: "Hoofdgerechten" },
  { value: "desserts", label: "Desserts" },
  { value: "bases", label: "Bases" },
  { value: "marinades", label: "Marinades" },
  { value: "overig", label: "Overig" },
];


interface NieuwReceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export function NieuwReceptModal({ open, onOpenChange, onCreated }: NieuwReceptModalProps) {
  const { createRecept } = useReceptMutations();
  const [naam, setNaam] = React.useState("");
  const [categorie, setCategorie] = React.useState("");
  const [porties, setPorties] = React.useState(4);
  const type = "halffabricaat";

  const resetForm = () => {
    setNaam("");
    setCategorie("");
    setPorties(4);
  };

  const canSave = naam.trim() && categorie && type;

  const handleSave = () => {
    createRecept.mutate(
      { naam: naam.trim(), categorie, type, porties },
      {
        onSuccess: (id) => {
          resetForm();
          onOpenChange(false);
          onCreated(id);
        },
      }
    );
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
      title="Nieuw recept"
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSave}
            disabled={!canSave}
            isLoading={createRecept.isPending}
          >
            Aanmaken
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Naam *</label>
          <NestoInput
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="bijv. Tomatensoep"
            autoFocus
          />
        </div>
        <NestoSelect
          label="Categorie *"
          value={categorie}
          onValueChange={setCategorie}
          options={CATEGORIE_OPTIONS}
          placeholder="Selecteer categorie"
        />
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Porties</label>
          <NestoInput
            type="number"
            min={1}
            value={porties}
            onChange={(e) => setPorties(Number(e.target.value) || 1)}
          />
        </div>
      </div>
    </NestoModal>
  );
}
