import * as React from "react";
import { ReceptDetail, HalffabricaatMethodeRow } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { useRecepten } from "@/hooks/useRecepten";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Trash2, Plus } from "lucide-react";

const METHODE_TYPES = [
  { value: "Bereiden", label: "Bereiden" },
  { value: "Aanvullen", label: "Aanvullen" },
  { value: "Snijden", label: "Snijden" },
  { value: "Roosteren", label: "Roosteren" },
  { value: "Portioneren", label: "Portioneren" },
  { value: "Uithalen", label: "Uithalen" },
  { value: "Ontdooien", label: "Ontdooien" },
  { value: "Opwarmen", label: "Opwarmen" },
  { value: "Afmaken", label: "Afmaken" },
  { value: "Overig", label: "Overig" },
];

const OUTPUT_EENHEID_OPTIONS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "porties", label: "porties" },
  { value: "stuks", label: "stuks" },
];

interface MethodesTabProps {
  recept: ReceptDetail;
}

export function MethodesTab({ recept }: MethodesTabProps) {
  const { addMethode, updateMethode, removeMethode } = useReceptMutations();
  const { data: alleRecepten } = useRecepten({
    search: "",
    categorie: "",
    showArchived: false,
  });

  const subReceptOptions = (alleRecepten || [])
    .filter((r) => r.id !== recept.id)
    .map((r) => ({ value: r.id, label: r.naam }));

  const methodes = [...recept.halffabricaat_methodes].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const handleAdd = () => {
    addMethode.mutate({
      receptId: recept.id,
      type: "Bereiden",
      visueleEenheid: "",
      outputHoeveelheid: 1,
      outputEenheid: "kg",
      standaardDuur: 30,
      sortOrder: methodes.length,
    });
  };

  return (
    <div className="space-y-3">
      {methodes.map((m) => (
        <MethodeCard
          key={m.id}
          methode={m}
          receptId={recept.id}
          subReceptOptions={subReceptOptions}
          onUpdate={(updates) =>
            updateMethode.mutate({ id: m.id, ...updates })
          }
          onRemove={() =>
            removeMethode.mutate({ id: m.id, receptId: recept.id })
          }
        />
      ))}

      <NestoButton
        variant="outline"
        onClick={handleAdd}
        leftIcon={<Plus className="h-4 w-4" />}
        className="w-full min-h-[48px]"
        isLoading={addMethode.isPending}
      >
        Methode toevoegen
      </NestoButton>
    </div>
  );
}

interface MethodeCardProps {
  methode: HalffabricaatMethodeRow;
  receptId: string;
  subReceptOptions: { value: string; label: string }[];
  onUpdate: (updates: Record<string, unknown>) => void;
  onRemove: () => void;
}

function MethodeCard({ methode, receptId, subReceptOptions, onUpdate, onRemove }: MethodeCardProps) {
  const [type, setType] = React.useState(methode.type);
  const [visueleEenheid, setVisueleEenheid] = React.useState(methode.visuele_eenheid);
  const [outputHoeveelheid, setOutputHoeveelheid] = React.useState(methode.output_hoeveelheid);
  const [outputEenheid, setOutputEenheid] = React.useState(methode.output_eenheid);
  const [duur, setDuur] = React.useState(methode.standaard_duur);
  const [houdbaarheid, setHoudbaarheid] = React.useState(methode.houdbaarheid ?? 0);
  const [instructie, setInstructie] = React.useState(methode.instructie ?? "");
  const [subReceptId, setSubReceptId] = React.useState(methode.sub_recept_id ?? "");

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <NestoSelect
          value={type}
          onValueChange={(v) => {
            setType(v);
            onUpdate({ type: v });
          }}
          options={METHODE_TYPES}
          size="sm"
        />
        <button
          onClick={onRemove}
          className="p-2 rounded-md hover:bg-destructive/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Visuele eenheid</label>
          <NestoInput
            value={visueleEenheid}
            onChange={(e) => setVisueleEenheid(e.target.value)}
            onBlur={() => onUpdate({ visuele_eenheid: visueleEenheid })}
            placeholder="bijv. bak, fles"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Duur (min)</label>
          <NestoInput
            type="number"
            min={0}
            value={duur}
            onChange={(e) => setDuur(Number(e.target.value))}
            onBlur={() => onUpdate({ standaard_duur: duur })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Output</label>
          <NestoInput
            type="number"
            min={0}
            value={outputHoeveelheid}
            onChange={(e) => setOutputHoeveelheid(Number(e.target.value))}
            onBlur={() => onUpdate({ output_hoeveelheid: outputHoeveelheid })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Eenheid</label>
          <NestoSelect
            value={outputEenheid}
            onValueChange={(v) => {
              setOutputEenheid(v);
              onUpdate({ output_eenheid: v });
            }}
            options={OUTPUT_EENHEID_OPTIONS}
            size="sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Houdbaar (dagen)</label>
          <NestoInput
            type="number"
            min={0}
            value={houdbaarheid}
            onChange={(e) => setHoudbaarheid(Number(e.target.value))}
            onBlur={() => onUpdate({ houdbaarheid: houdbaarheid || null })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {type === "Bereiden" ? (
        <NestoSelect
          label="Sub-recept"
          value={subReceptId}
          onValueChange={(v) => {
            setSubReceptId(v);
            onUpdate({ sub_recept_id: v || null });
          }}
          options={subReceptOptions}
          placeholder="Selecteer sub-recept..."
          size="sm"
        />
      ) : (
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">Instructie</label>
          <textarea
            value={instructie}
            onChange={(e) => setInstructie(e.target.value)}
            onBlur={() => onUpdate({ instructie: instructie || null })}
            placeholder="Beschrijf de stappen..."
            className="w-full min-h-[60px] rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none resize-y"
          />
        </div>
      )}
    </div>
  );
}
