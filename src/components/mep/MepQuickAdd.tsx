import { useState } from "react";
import { NestoInput } from "@/components/polar/NestoInput";
import { Search } from "lucide-react";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useCreateMepTask, useUpdateMepTask } from "@/hooks/useMepMutations";
import { MepQuickAddDropdown } from "./MepQuickAddDropdown";
import { SnellePrepModal } from "./SnellePrepModal";
import { addDays, format } from "date-fns";
import { nestoToast } from "@/lib/nestoToast";
import type { MepTask } from "@/hooks/useMepTasks";
import type { HalffabricaatSearchResult } from "@/hooks/useHalffabricaatSearch";
import type { IngredientResult } from "./MepQuickAddDropdown";

interface MepQuickAddProps {
  taskDate: string;
  dayTasks: MepTask[];
}

export function MepQuickAdd({ taskDate, dayTasks }: MepQuickAddProps) {
  const [search, setSearch] = useState("");
  const [prepIngredient, setPrepIngredient] = useState<IngredientResult | null>(null);

  const { data: halffabricaten = [], isLoading: hfLoading } = useHalffabricaatSearch(search);
  const { data: ingredienten = [], isLoading: igLoading } = useIngredientSearch(search);
  const createTask = useCreateMepTask();
  const updateTask = useUpdateMepTask();

  const isPending = createTask.isPending || updateTask.isPending;
  const isLoading = hfLoading || igLoading;

  function getSmartDate(): string {
    const now = new Date();
    const isToday = taskDate === format(now, "yyyy-MM-dd");
    return isToday && now.getHours() >= 17
      ? format(addDays(now, 1), "yyyy-MM-dd")
      : taskDate;
  }

  const handleAddHalffabricaat = (
    item: HalffabricaatSearchResult,
    methode?: HalffabricaatSearchResult["methodes"][0]
  ) => {
    const smartDate = getSmartDate();
    const existing = dayTasks.find(
      (t) =>
        t.recept_id === item.id &&
        (!methode || t.methode_id === methode.id) &&
        t.task_date === smartDate &&
        t.status !== "completed" &&
        t.status !== "cancelled"
    );

    if (existing) {
      const newUnits = (existing.units ?? 1) + 1;
      updateTask.mutate({ id: existing.id, units: newUnits });
      nestoToast.success(`${item.naam} — verhoogd naar ${newUnits}×`);
    } else {
      const title = methode
        ? `${item.naam} ${methode.type.toLowerCase()}`
        : item.naam;
      createTask.mutate({
        title,
        category: item.categorie || "halffabricaat",
        task_date: smartDate,
        recept_id: item.id,
        methode_id: methode?.id ?? null,
        units: 1,
        prioriteit: "Normaal",
      });
    }
    setSearch("");
  };

  const handleSelectIngredient = (item: IngredientResult) => {
    setPrepIngredient(item);
    setSearch("");
  };

  const handleAddFreeTask = () => {
    const smartDate = getSmartDate();
    const title = search.trim();
    if (!title) return;

    const existing = dayTasks.find(
      (t) =>
        t.title === title &&
        !t.recept_id &&
        t.task_date === smartDate &&
        t.status !== "completed" &&
        t.status !== "cancelled"
    );

    if (existing) {
      const newUnits = (existing.units ?? 1) + 1;
      updateTask.mutate({ id: existing.id, units: newUnits });
      nestoToast.success(`${title} — verhoogd naar ${newUnits}×`);
    } else {
      createTask.mutate({
        title,
        category: "Overig",
        task_date: smartDate,
        units: 1,
        prioriteit: "Normaal",
      });
    }
    setSearch("");
  };

  const showDropdown = search.trim().length >= 2;

  return (
    <div>
      <div className="relative">
        <NestoInput
          placeholder="Zoek halffabricaat, ingrediënt of voeg taak toe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        {showDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <MepQuickAddDropdown
              search={search.trim()}
              halffabricaten={halffabricaten}
              ingredienten={ingredienten}
              isLoading={isLoading}
              isPending={isPending}
              onSelectHalffabricaat={handleAddHalffabricaat}
              onSelectIngredient={handleSelectIngredient}
              onAddFreeTask={handleAddFreeTask}
            />
          </div>
        )}
      </div>

      {prepIngredient && (
        <SnellePrepModal
          open={!!prepIngredient}
          onOpenChange={(open) => { if (!open) setPrepIngredient(null); }}
          ingredient={prepIngredient}
          taskDate={getSmartDate()}
        />
      )}
    </div>
  );
}
