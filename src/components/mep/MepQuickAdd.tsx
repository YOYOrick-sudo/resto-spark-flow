import { useState } from "react";
import { NestoInput } from "@/components/polar/NestoInput";
import { Search, AlertTriangle } from "lucide-react";
import { useHalffabricaatSearch } from "@/hooks/useHalffabricaatSearch";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { useCreateMepTask, useUpdateMepTask } from "@/hooks/useMepMutations";
import { MepQuickAddDropdown } from "./MepQuickAddDropdown";
import { SnellePrepModal } from "./SnellePrepModal";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";
import { addDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { nestoToast } from "@/lib/nestoToast";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLocationScheduleRange } from "@/hooks/useLocationScheduleRange";
import { useMepFavorieten, useAddMepFavoriet, useRemoveMepFavoriet } from "@/hooks/useMepFavorieten";
import type { MepTask } from "@/hooks/useMepTasks";
import type { HalffabricaatSearchResult } from "@/hooks/useHalffabricaatSearch";
import type { IngredientResult } from "./MepQuickAddDropdown";
import type { MepFavoriet } from "@/hooks/useMepFavorieten";

interface MepQuickAddProps {
  taskDate: string;
  dayTasks: MepTask[];
  isClosedOnSelectedDate?: boolean;
  closedLabel?: string | null;
}

export function MepQuickAdd({ taskDate, dayTasks, isClosedOnSelectedDate, closedLabel }: MepQuickAddProps) {
  const [search, setSearch] = useState("");
  const [prepIngredient, setPrepIngredient] = useState<IngredientResult | null>(null);
  const [pendingAction, setPendingAction] = useState<{ run: () => void; date: string; label: string | null } | null>(null);
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const { data: halffabricaten = [], isLoading: hfLoading } = useHalffabricaatSearch(search);
  const { data: ingredienten = [], isLoading: igLoading } = useIngredientSearch(search);
  const { data: favorieten = [] } = useMepFavorieten();
  const createTask = useCreateMepTask();
  const updateTask = useUpdateMepTask();
  const addFavoriet = useAddMepFavoriet();
  const removeFavoriet = useRemoveMepFavoriet();

  // Hergebruik dezelfde combi-hook (zelfde queryKey args = gedeelde cache met MepTaken)
  const { isClosedOnDate } = useLocationScheduleRange(locationId, taskDate, 30);

  const isPending = createTask.isPending || updateTask.isPending;
  const isLoading = hfLoading || igLoading;

  function getSmartDate(): string {
    const now = new Date();
    const isToday = taskDate === format(now, "yyyy-MM-dd");
    return isToday && now.getHours() >= 17
      ? format(addDays(now, 1), "yyyy-MM-dd")
      : taskDate;
  }

  // Wikkel een create-actie: als smartDate gesloten valt, vraag confirm; anders direct uit.
  function runWithClosedCheck(date: string, run: () => void) {
    const info = isClosedOnDate(date);
    if (info.closed) {
      setPendingAction({ run, date, label: info.label });
    } else {
      run();
    }
  }

  const autoSaveFavoriet = (input: {
    title: string;
    category: string;
    recept_id?: string | null;
    methode_id?: string | null;
  }) => {
    addFavoriet.mutate(input);
  };

  const handleAddHalffabricaat = async (
    item: HalffabricaatSearchResult,
    methode?: HalffabricaatSearchResult["methodes"][0]
  ) => {
    const smartDate = getSmartDate();

    if (locationId) {
      let query = supabase
        .from("mep_tasks")
        .select("id, units")
        .eq("location_id", locationId)
        .eq("recept_id", item.id)
        .eq("task_date", smartDate)
        .not("status", "in", '("completed","cancelled")')
        .limit(1);

      if (methode) {
        query = query.eq("methode_id", methode.id);
      } else {
        query = query.is("methode_id", null);
      }

      const { data: existing } = await query;

      if (existing && existing.length > 0) {
        const task = existing[0];
        const newUnits = (task.units ?? 1) + 1;
        updateTask.mutate({ id: task.id, units: newUnits });
        
        setSearch("");
        return;
      }
    }

    const title = item.naam;
    runWithClosedCheck(smartDate, () => {
      createTask.mutate({
        title,
        category: item.categorie || "halffabricaat",
        task_date: smartDate,
        recept_id: item.id,
        methode_id: methode?.id ?? null,
        units: 1,
        prioriteit: "Normaal",
      });
      autoSaveFavoriet({
        title,
        category: item.categorie || "halffabricaat",
        recept_id: item.id,
        methode_id: methode?.id,
      });
    });
    setSearch("");
  };

  const handleSelectIngredient = (item: IngredientResult) => {
    setPrepIngredient(item);
    setSearch("");
  };

  const handleAddFreeTask = async () => {
    const smartDate = getSmartDate();
    const title = search.trim();
    if (!title) return;

    if (locationId) {
      const { data: existing } = await supabase
        .from("mep_tasks")
        .select("id, units")
        .eq("location_id", locationId)
        .eq("title", title)
        .is("recept_id", null)
        .eq("task_date", smartDate)
        .not("status", "in", '("completed","cancelled")')
        .limit(1);

      if (existing && existing.length > 0) {
        const task = existing[0];
        const newUnits = (task.units ?? 1) + 1;
        updateTask.mutate({ id: task.id, units: newUnits });
        
        setSearch("");
        return;
      }
    }

    createTask.mutate({
      title,
      category: "Overig",
      task_date: smartDate,
      units: 1,
      prioriteit: "Normaal",
    });
    autoSaveFavoriet({ title, category: "Overig" });
    setSearch("");
  };

  const handleFavorietSelect = async (fav: MepFavoriet) => {
    if (fav.recept_id) {
      const smartDate = getSmartDate();

      if (locationId) {
        let query = supabase
          .from("mep_tasks")
          .select("id, units")
          .eq("location_id", locationId)
          .eq("recept_id", fav.recept_id)
          .eq("task_date", smartDate)
          .not("status", "in", '("completed","cancelled")')
          .limit(1);

        if (fav.methode_id) {
          query = query.eq("methode_id", fav.methode_id);
        } else {
          query = query.is("methode_id", null);
        }

        const { data: existing } = await query;

        if (existing && existing.length > 0) {
          const task = existing[0];
          const newUnits = (task.units ?? 1) + 1;
          updateTask.mutate({ id: task.id, units: newUnits });
          setSearch("");
          return;
        }
      }

      createTask.mutate({
        title: fav.title,
        category: fav.category,
        task_date: getSmartDate(),
        recept_id: fav.recept_id,
        methode_id: fav.methode_id ?? null,
        units: 1,
        prioriteit: "Normaal",
      });
    } else {
      const smartDate = getSmartDate();

      if (locationId) {
        const { data: existing } = await supabase
          .from("mep_tasks")
          .select("id, units")
          .eq("location_id", locationId)
          .eq("title", fav.title)
          .is("recept_id", null)
          .eq("task_date", smartDate)
          .not("status", "in", '("completed","cancelled")')
          .limit(1);

        if (existing && existing.length > 0) {
          const task = existing[0];
          const newUnits = (task.units ?? 1) + 1;
          updateTask.mutate({ id: task.id, units: newUnits });
          setSearch("");
          return;
        }
      }

      createTask.mutate({
        title: fav.title,
        category: fav.category,
        task_date: smartDate,
        units: 1,
        prioriteit: "Normaal",
      });
    }
    setSearch("");
  };

  const showDropdown = search.trim().length >= 2;

  return (
    <div className="space-y-2">
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
              favorieten={favorieten}
              isLoading={isLoading}
              isPending={isPending}
              onSelectHalffabricaat={handleAddHalffabricaat}
              onSelectIngredient={handleSelectIngredient}
              onAddFreeTask={handleAddFreeTask}
              onSelectFavoriet={handleFavorietSelect}
              onRemoveFavoriet={(id) => removeFavoriet.mutate(id)}
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
