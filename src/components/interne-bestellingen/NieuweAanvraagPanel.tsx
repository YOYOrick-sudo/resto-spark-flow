import { useState } from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserContext } from "@/contexts/UserContext";
import { useInterneBestellingMutations } from "@/hooks/useInterneBestellingMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { Plus, Trash2, Search } from "lucide-react";
import { format, addDays } from "date-fns";

interface RegelInput {
  key: number;
  ingredient_id: string | null;
  recept_id: string | null;
  omschrijving: string;
  hoeveelheid: string;
  eenheid: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

let keyCounter = 0;

function emptyRegel(): RegelInput {
  return {
    key: ++keyCounter,
    ingredient_id: null,
    recept_id: null,
    omschrijving: "",
    hoeveelheid: "",
    eenheid: "kg",
  };
}

export function NieuweAanvraagPanel({ open, onClose }: Props) {
  const { currentLocation, availableLocations } = useUserContext();
  const { createBestelling } = useInterneBestellingMutations();

  const [naarLocationId, setNaarLocationId] = useState("");
  const [gewensteDatum, setGewensteDatum] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [notities, setNotities] = useState("");
  const [regels, setRegels] = useState<RegelInput[]>([emptyRegel()]);

  const andereLocaties = availableLocations.filter(
    (l) => l.id !== currentLocation?.id
  );

  const handleReset = () => {
    setNaarLocationId("");
    setGewensteDatum(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    setNotities("");
    setRegels([emptyRegel()]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const addRegel = () => setRegels((prev) => [...prev, emptyRegel()]);

  const removeRegel = (key: number) =>
    setRegels((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const updateRegel = (key: number, field: keyof RegelInput, value: any) =>
    setRegels((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );

  const canSubmit =
    naarLocationId &&
    regels.every((r) => r.omschrijving && parseFloat(r.hoeveelheid) > 0 && r.eenheid);

  const handleSubmit = async () => {
    await createBestelling.mutateAsync({
      naar_location_id: naarLocationId,
      gewenste_datum: gewensteDatum || null,
      notities: notities || null,
      regels: regels.map((r) => ({
        ingredient_id: r.ingredient_id,
        recept_id: r.recept_id,
        omschrijving: r.omschrijving,
        gevraagde_hoeveelheid: parseFloat(r.hoeveelheid),
        eenheid: r.eenheid,
      })),
    });
    handleClose();
  };

  return (
    <NestoPanel
      open={open}
      onClose={handleClose}
      title="Transfer · Nieuwe aanvraag"
      footer={
        <div className="flex gap-2">
          <NestoButton variant="ghost" onClick={handleClose} className="min-h-[44px]">
            Annuleren
          </NestoButton>
          <NestoButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit || createBestelling.isPending}
            className="flex-1 min-h-[48px]"
          >
            Verstuur aanvraag
          </NestoButton>
        </div>
      }
    >
      {(titleRef) => (
        <div className="px-5 py-6">
          <h2 ref={titleRef} className="text-h2 mb-6">Nieuwe aanvraag</h2>

          {/* Bestemmingslocatie */}
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5">Aanvragen bij vestiging *</Label>
              <NestoSelect
                value={naarLocationId}
                onValueChange={setNaarLocationId}
                placeholder="Kies vestiging"
                options={andereLocaties.map((l) => ({
                  value: l.id,
                  label: l.name,
                }))}
              />
            </div>

            <div>
              <Label className="mb-1.5">Gewenste datum</Label>
              <Input
                type="date"
                value={gewensteDatum}
                onChange={(e) => setGewensteDatum(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div className="border-t border-border/50 pt-4 mt-6">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
              Items
            </p>

            <div className="space-y-4">
              {regels.map((regel) => (
                <RegelRow
                  key={regel.key}
                  regel={regel}
                  onChange={(field, value) => updateRegel(regel.key, field, value)}
                  onRemove={() => removeRegel(regel.key)}
                  canRemove={regels.length > 1}
                />
              ))}
            </div>

            <NestoButton
              variant="ghost"
              size="sm"
              onClick={addRegel}
              className="mt-3 min-h-[44px]"
            >
              <Plus className="h-4 w-4 mr-1" /> Item toevoegen
            </NestoButton>
          </div>

          {/* Notities */}
          <div className="border-t border-border/50 pt-4 mt-6">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
              Notities
            </p>
            <Textarea
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              placeholder="Optionele opmerkingen..."
              rows={3}
            />
          </div>
        </div>
      )}
    </NestoPanel>
  );
}

function RegelRow({
  regel,
  onChange,
  onRemove,
  canRemove,
}: {
  regel: RegelInput;
  onChange: (field: keyof RegelInput, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useIngredientSearch(searchTerm);

  return (
    <div className="bg-accent/30 rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={regel.omschrijving}
              onChange={(e) => {
                onChange("omschrijving", e.target.value);
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Zoek ingrediënt of typ vrije tekst..."
              className="pl-8 h-9"
            />
          </div>
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors min-h-[44px]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange("omschrijving", s.naam);
                    onChange("ingredient_id", s.id);
                    onChange("eenheid", s.eenheid);
                    setShowSuggestions(false);
                  }}
                >
                  <span className="font-medium">{s.naam}</span>
                  <span className="text-muted-foreground ml-2">({s.eenheid})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.01"
          value={regel.hoeveelheid}
          onChange={(e) => onChange("hoeveelheid", e.target.value)}
          placeholder="Hoeveel"
          className="w-24 h-9"
        />
        <Input
          value={regel.eenheid}
          onChange={(e) => onChange("eenheid", e.target.value)}
          placeholder="Eenheid"
          className="w-20 h-9"
        />
      </div>
    </div>
  );
}
