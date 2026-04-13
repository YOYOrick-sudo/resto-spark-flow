import { useState } from "react";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { Search, Plus, Loader2 } from "lucide-react";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useCreateMepTask } from "@/hooks/useMepMutations";

interface MepQuickAddProps {
  taskDate: string;
}

export function MepQuickAdd({ taskDate }: MepQuickAddProps) {
  const [search, setSearch] = useState("");

  const { data: results = [], isLoading } = useHalffabricaatSearch(search);
  const createTask = useCreateMepTask();

  const handleAddFromRecept = (item: (typeof results)[0]) => {
    const methode = item.methodes?.[0];
    createTask.mutate({
      title: item.naam,
      category: item.categorie || "halffabricaat",
      task_date: taskDate,
      recept_id: item.id,
      methode_id: methode?.id,
      units: 1,
      prioriteit: "Normaal",
    });
    setSearch("");
  };



  return (
    <div className="space-y-4">
      {/* Search existing recipes */}
      <div className="relative">
        <NestoInput
          placeholder="Zoek recept of halffabricaat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        {search.trim().length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Geen resultaten</p>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center justify-between min-h-[44px]"
                  onClick={() => handleAddFromRecept(item)}
                  disabled={createTask.isPending}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.naam}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.categorie}
                      {item.methodes?.[0] && ` · ${item.methodes[0].visuele_eenheid}`}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Manual add */}
      <div className="flex gap-2">
        <div className="flex-1">
          <NestoInput
            placeholder="Of voeg handmatig toe..."
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
          />
        </div>
        <NestoSelect
          value={manualCategory}
          onValueChange={setManualCategory}
          options={[
            { value: "halffabricaat", label: "Halffabricaat" },
            { value: "mise_en_place", label: "Mise en place" },
            { value: "schoonmaak", label: "Schoonmaak" },
            { value: "overig", label: "Overig" },
          ]}
        />
        <NestoButton
          variant="primary"
          onClick={handleAddManual}
          disabled={!manualTitle.trim() || createTask.isPending}
          className="min-w-[44px]"
        >
          <Plus className="h-4 w-4" />
        </NestoButton>
      </div>
    </div>
  );
}
