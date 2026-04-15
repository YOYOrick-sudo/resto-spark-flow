import * as React from "react";
import { ReceptDetail, HalffabricaatMethodeRow } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { useRecepten } from "@/hooks/useRecepten";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Import portie utility
import { berekenPortieGrootte } from "@/utils/portieGrootte";

export function MethodesTab({ recept }: MethodesTabProps) {
  const { addMethode, updateMethode, removeMethode } = useReceptMutations();
  const { data: alleRecepten } = useRecepten({
    search: "",
    categorie: "",
    showArchived: false,
  });
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

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

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full overflow-auto rounded-2xl bg-card shadow-card">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_100px_80px_80px_1fr_40px] gap-1 px-3 pt-3 pb-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">#</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Output</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duur</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Houdbaar</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Detail</span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {methodes.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nog geen methodes toegevoegd
          </div>
        ) : (
          methodes.map((m, index) => (
            <MethodeRow
              key={m.id}
              methode={m}
              index={index}
              porties={recept.porties}
              subReceptOptions={subReceptOptions}
              isExpanded={expandedRows.has(m.id)}
              onToggleExpand={() => toggleRow(m.id)}
              onUpdate={(updates) => updateMethode.mutate({ id: m.id, ...updates })}
              onRemove={() => removeMethode.mutate({ id: m.id, receptId: recept.id })}
            />
          ))
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t border-border/50">
        <NestoButton
          variant="outline"
          onClick={handleAdd}
          leftIcon={<Plus className="h-4 w-4" />}
          className="w-full min-h-[40px]"
          isLoading={addMethode.isPending}
        >
          Methode toevoegen
        </NestoButton>
      </div>
    </div>
  );
}

interface MethodeRowProps {
  methode: HalffabricaatMethodeRow;
  index: number;
  porties: number;
  subReceptOptions: { value: string; label: string }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onRemove: () => void;
}

function MethodeRow({
  methode,
  index,
  porties,
  subReceptOptions,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: MethodeRowProps) {
  const [type, setType] = React.useState(methode.type);
  const [outputHoeveelheid, setOutputHoeveelheid] = React.useState(methode.output_hoeveelheid);
  const [outputEenheid, setOutputEenheid] = React.useState(methode.output_eenheid);
  const [duur, setDuur] = React.useState(methode.standaard_duur);
  const [houdbaarheid, setHoudbaarheid] = React.useState(methode.houdbaarheid ?? 0);
  const [instructie, setInstructie] = React.useState(methode.instructie ?? "");
  const [subReceptId, setSubReceptId] = React.useState(methode.sub_recept_id ?? "");

  const portie = berekenPortieGrootte(outputHoeveelheid, outputEenheid, porties);

  const hasDetail = type === "Bereiden" || instructie.length > 0;

  return (
    <div className="group">
      {/* Main row */}
      <div className="grid grid-cols-[32px_1fr_100px_80px_80px_1fr_40px] gap-1 items-center px-3 py-2.5 hover:bg-accent/40 transition-colors duration-150">
        {/* # */}
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{index + 1}</span>

        {/* Type */}
        <NestoSelect
          value={type}
          onValueChange={(v) => {
            setType(v);
            onUpdate({ type: v });
          }}
          options={METHODE_TYPES}
          size="sm"
        />

        {/* Output: number + eenheid */}
        <div className="flex items-center gap-1">
          <NestoInput
            type="number"
            min={0}
            value={outputHoeveelheid}
            onChange={(e) => { const v = e.target.value; if (v === "") return; setOutputHoeveelheid(Number(v)); }}
            onBlur={() => onUpdate({ output_hoeveelheid: outputHoeveelheid })}
            className="h-7 text-xs w-12 tabular-nums"
          />
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
        {portie && (
          <span className="text-[11px] text-muted-foreground col-span-2 pl-8 -mt-1.5">
            = {portie.display} per portie
          </span>
        )}

        {/* Duur */}
        <div className="flex items-center gap-1">
          <NestoInput
            type="number"
            min={0}
            value={duur}
            onChange={(e) => { const v = e.target.value; if (v === "") return; setDuur(Number(v)); }}
            onBlur={() => onUpdate({ standaard_duur: duur })}
            className="h-7 text-xs w-12 tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">min</span>
        </div>

        {/* Houdbaar */}
        <div className="flex items-center gap-1">
          <NestoInput
            type="number"
            min={0}
            value={houdbaarheid}
            onChange={(e) => { const v = e.target.value; if (v === "") return; setHoudbaarheid(Number(v)); }}
            onBlur={() => onUpdate({ houdbaarheid: houdbaarheid || null })}
            className="h-7 text-xs w-12 tabular-nums"
          />
          <span className="text-[11px] text-muted-foreground">d</span>
        </div>

        {/* Detail toggle */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 text-left truncate"
        >
          {type === "Bereiden" ? (
            <span className="truncate">
              {subReceptId
                ? subReceptOptions.find((o) => o.value === subReceptId)?.label ?? "Sub-recept"
                : "Sub-recept..."}
            </span>
          ) : (
            <span className="truncate">{instructie || "Instructie..."}</span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          )}
        </button>

        {/* Delete */}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all duration-150 flex items-center justify-center"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>

      {/* Expanded detail row */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 pl-[44px]">
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
            <textarea
              value={instructie}
              onChange={(e) => setInstructie(e.target.value)}
              onBlur={() => onUpdate({ instructie: instructie || null })}
              placeholder="Beschrijf de stappen..."
              className="w-full min-h-[60px] rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none resize-y"
            />
          )}
        </div>
      )}
    </div>
  );
}
