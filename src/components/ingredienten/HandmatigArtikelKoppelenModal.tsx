import { useMemo, useState } from "react";
import {
  NestoPanel,
  NestoButton,
  NestoInput,
  NestoSelect,
  FormSection,
} from "@/components/polar";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { nestoToast } from "@/lib/nestoToast";

interface Props {
  open: boolean;
  onClose: () => void;
  ingredientId: string;
  ingredientNaam: string;
  ingredientEenheid: string;
}

const VERPAKKING_EENHEDEN = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "st", label: "stuk" },
  { value: "doos", label: "doos" },
  { value: "pak", label: "pak" },
  { value: "fles", label: "fles" },
];

type PrijsModus = "verpakking" | "eenheid";

export function HandmatigArtikelKoppelenModal({
  open,
  onClose,
  ingredientId,
  ingredientNaam,
  ingredientEenheid,
}: Props) {
  const { data: leveranciers } = useLeveranciers();
  const { createArtikel } = useVoorraadInkoopMutations();

  const [leverancierId, setLeverancierId] = useState("");
  const [artikelNummer, setArtikelNummer] = useState("");
  const [artikelNaam, setArtikelNaam] = useState(ingredientNaam);
  const [verpakkingHoeveelheid, setVerpakkingHoeveelheid] = useState<string>("");
  const [verpakkingEenheid, setVerpakkingEenheid] = useState<string>(ingredientEenheid);
  const [prijsPerVerpakking, setPrijsPerVerpakking] = useState<string>("");
  const [prijsPerEenheidInput, setPrijsPerEenheidInput] = useState<string>("");
  const [prijsModus, setPrijsModus] = useState<PrijsModus>("verpakking");

  const leverancierOpties = useMemo(
    () => (leveranciers ?? []).map((l) => ({ value: l.id, label: l.naam })),
    [leveranciers]
  );

  // Auto-bereken prijs per eenheid wanneer in 'verpakking' modus
  const berekendePrijsPerEenheid = useMemo(() => {
    if (prijsModus !== "verpakking") return null;
    const pv = parseFloat(prijsPerVerpakking);
    const vh = parseFloat(verpakkingHoeveelheid);
    if (!isFinite(pv) || !isFinite(vh) || vh <= 0) return null;
    return pv / vh;
  }, [prijsModus, prijsPerVerpakking, verpakkingHoeveelheid]);

  const reset = () => {
    setLeverancierId("");
    setArtikelNummer("");
    setArtikelNaam(ingredientNaam);
    setVerpakkingHoeveelheid("");
    setVerpakkingEenheid(ingredientEenheid);
    setPrijsPerVerpakking("");
    setPrijsPerEenheidInput("");
    setPrijsModus("verpakking");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!leverancierId) {
      nestoToast.error("Kies een leverancier");
      return;
    }
    if (!artikelNummer.trim()) {
      nestoToast.error("Artikelnummer is verplicht");
      return;
    }
    if (!artikelNaam.trim()) {
      nestoToast.error("Artikelnaam is verplicht");
      return;
    }

    const vh = parseFloat(verpakkingHoeveelheid);
    const pv = parseFloat(prijsPerVerpakking);
    const peManual = parseFloat(prijsPerEenheidInput);

    const prijsPerEenheid =
      prijsModus === "verpakking"
        ? berekendePrijsPerEenheid ?? undefined
        : isFinite(peManual)
          ? peManual
          : undefined;

    try {
      await createArtikel.mutateAsync({
        leverancier_id: leverancierId,
        ingredient_id: ingredientId,
        artikel_naam: artikelNaam.trim(),
        artikel_nummer: artikelNummer.trim(),
        verpakking_hoeveelheid: isFinite(vh) ? vh : undefined,
        verpakking_eenheid: verpakkingEenheid || undefined,
        prijs_per_verpakking:
          prijsModus === "verpakking" && isFinite(pv) ? pv : undefined,
        prijs_per_eenheid: prijsPerEenheid,
      });
      nestoToast.success("Leverancier-koppeling toegevoegd");
      handleClose();
    } catch {
      // toast wordt al door mutation getoond
    }
  };

  return (
    <NestoPanel
      open={open}
      onClose={handleClose}
      title="Leverancier handmatig toevoegen"
      footer={
        <div className="flex justify-end gap-2">
          <NestoButton variant="ghost" onClick={handleClose}>
            Annuleren
          </NestoButton>
          <NestoButton
            variant="primary"
            onClick={handleSubmit}
            disabled={createArtikel.isPending}
          >
            {createArtikel.isPending ? "Opslaan…" : "Opslaan"}
          </NestoButton>
        </div>
      }
    >
      {(titleRef) => (
        <div className="space-y-6">
          <h2 ref={titleRef} className="text-lg font-semibold text-foreground">
            Leverancier handmatig toevoegen
          </h2>
          <p className="text-sm text-muted-foreground -mt-4">
            Koppel een leverancier-artikel aan{" "}
            <span className="font-medium text-foreground">{ingredientNaam}</span>.
          </p>

          <FormSection title="Leverancier & artikel">
            <div className="space-y-3">
              <NestoSelect
                label="Leverancier"
                value={leverancierId}
                onValueChange={setLeverancierId}
                options={leverancierOpties}
                placeholder="Kies leverancier…"
              />
              <NestoInput
                label="Artikelnummer"
                value={artikelNummer}
                onChange={(e) => setArtikelNummer(e.target.value)}
                placeholder="Bijv. 815311"
                required
              />
              <NestoInput
                label="Artikelnaam"
                value={artikelNaam}
                onChange={(e) => setArtikelNaam(e.target.value)}
                placeholder="Volledige productnaam"
                required
              />
            </div>
          </FormSection>

          <FormSection title="Verpakking">
            <div className="grid grid-cols-2 gap-3">
              <NestoInput
                label="Hoeveelheid"
                type="number"
                step="0.001"
                value={verpakkingHoeveelheid}
                onChange={(e) => setVerpakkingHoeveelheid(e.target.value)}
                placeholder="Bijv. 1.5"
              />
              <NestoSelect
                label="Eenheid"
                value={verpakkingEenheid}
                onValueChange={setVerpakkingEenheid}
                options={VERPAKKING_EENHEDEN}
                placeholder="Eenheid"
              />
            </div>
          </FormSection>

          <FormSection title="Prijs">
            <div className="space-y-3">
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPrijsModus("verpakking")}
                  className={`px-3 py-1.5 rounded-md border transition-colors ${
                    prijsModus === "verpakking"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Per verpakking
                </button>
                <button
                  type="button"
                  onClick={() => setPrijsModus("eenheid")}
                  className={`px-3 py-1.5 rounded-md border transition-colors ${
                    prijsModus === "eenheid"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Per {ingredientEenheid}
                </button>
              </div>

              {prijsModus === "verpakking" ? (
                <>
                  <NestoInput
                    label="Prijs per verpakking (€)"
                    type="number"
                    step="0.01"
                    value={prijsPerVerpakking}
                    onChange={(e) => setPrijsPerVerpakking(e.target.value)}
                    placeholder="Bijv. 11.71"
                  />
                  <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Prijs per {ingredientEenheid}:{" "}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {berekendePrijsPerEenheid != null
                        ? `€${berekendePrijsPerEenheid.toFixed(4)}`
                        : "—"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Automatisch berekend uit prijs ÷ hoeveelheid.
                    </p>
                  </div>
                </>
              ) : (
                <NestoInput
                  label={`Prijs per ${ingredientEenheid} (€)`}
                  type="number"
                  step="0.0001"
                  value={prijsPerEenheidInput}
                  onChange={(e) => setPrijsPerEenheidInput(e.target.value)}
                  placeholder="Bijv. 7.81"
                />
              )}
            </div>
          </FormSection>
        </div>
      )}
    </NestoPanel>
  );
}
