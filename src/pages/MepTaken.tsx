import { useState, useEffect, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { PageHeader, ModuleSubNav } from "@/components/polar";
import { KEUKEN_SUBNAV } from "@/lib/moduleSubNav";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Sparkles, Trash2, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { useMepTasks, useMepTasksWeek, type MepTask } from "@/hooks/useMepTasks";
import { useCancelMepTask, useUpdateMepTask } from "@/hooks/useMepMutations";
import { useMepIngredientStock } from "@/hooks/useMepIngredientStock";
import { useUserContext } from "@/contexts/UserContext";
import { useLocationScheduleRange } from "@/hooks/useLocationScheduleRange";
import { MepQuickAdd } from "@/components/mep/MepQuickAdd";
import { MepWeekView } from "@/components/mep/MepWeekView";
import { MepCompletionModal } from "@/components/mep/MepCompletionModal";
import { MepCategoryView } from "@/components/mep/MepCategoryView";

import { MepDayPlan } from "@/components/mep/MepDayPlan";
import { WasteModal } from "@/components/mep/WasteModal";
import { PersoneelsmaaltijdModal } from "@/components/mep/PersoneelsmaaltijdModal";
import type { IngredientStockMap } from "@/utils/mepPriority";

type ViewMode = "categorie" | "week";
const STORAGE_KEY = "mep-view-preference";

function getInitialView(): ViewMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "categorie" || saved === "week") return saved;
  } catch {}
  return "categorie";
}

export default function MepTaken() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<ViewMode>(getInitialView);
  const [planOpen, setPlanOpen] = useState(false);
  const [planOrder, setPlanOrder] = useState<string[] | null>(null);
  const [wasteOpen, setWasteOpen] = useState(false);
  const [personeelOpen, setPersoneelOpen] = useState(false);

  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, view); } catch {}
  }, [view]);

  useEffect(() => {
    setPlanOrder(null);
  }, [selectedDate]);

  const goToday = () => setSelectedDate(today);
  const goPrev = () => setSelectedDate(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"));
  const goNext = () => setSelectedDate(format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"));

  const { data: dayTasks = [], isLoading: dayLoading } = useMepTasks(selectedDate);

  const weekStartStr = format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: weekTasks = [], isLoading: weekLoading } = useMepTasksWeek(weekStartStr, weekEndStr);

  // Operating-hours check (combi-hook, 1 RPC, gedeelde cache met QuickAdd)
  const { isClosedOnDate } = useLocationScheduleRange(locationId, selectedDate, 30);
  const closedInfo = isClosedOnDate(selectedDate);

  // Ingredient stock for priority scoring
  const { data: ingredientStock } = useMepIngredientStock(dayTasks, false);
  const stockMap: IngredientStockMap = ingredientStock ?? new Map();

  const cancelTask = useCancelMepTask();
  const updateTask = useUpdateMepTask();

  const [completionTask, setCompletionTask] = useState<MepTask | null>(null);

  const handlePriorityChange = (taskId: string, prioriteit: string) => {
    updateTask.mutate({ id: taskId, prioriteit });
  };

  const sortedDayTasks = useMemo(() => {
    if (!planOrder) return dayTasks;
    return [...dayTasks].sort((a, b) => {
      const idxA = planOrder.indexOf(a.id);
      const idxB = planOrder.indexOf(b.id);
      const posA = idxA === -1 ? 9999 : idxA;
      const posB = idxB === -1 ? 9999 : idxB;
      return posA - posB;
    });
  }, [dayTasks, planOrder]);

  const nonCancelled = dayTasks.filter((t) => t.status !== "cancelled");
  const completedCount = nonCancelled.filter((t) => t.status === "completed").length;
  const totalCount = nonCancelled.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  const openTaskCount = dayTasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;
  const showPlanButton = openTaskCount >= 2;

  const isToday = selectedDate === today;
  const dateLabel = format(new Date(selectedDate), "EEEE d MMMM", { locale: nl });

  return (
    <div className="space-y-6">
      <PageHeader
        title="MEP Taken"
        actions={
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <NestoBadge variant={progressPct > 0.5 ? "success" : "pending"}>
                {completedCount}/{totalCount} klaar
              </NestoBadge>
            )}
            {showPlanButton && (
              <NestoButton
                variant="outline"
                size="sm"
                onClick={() => setPlanOpen(true)}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Plan mijn dag
              </NestoButton>
            )}
            <NestoButton
              variant="ghost"
              size="sm"
              onClick={() => setWasteOpen(true)}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Waste
            </NestoButton>
            <NestoButton
              variant="ghost"
              size="sm"
              onClick={() => setPersoneelOpen(true)}
              className="gap-1.5"
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Personeel
            </NestoButton>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <NestoButton
                variant="ghost"
                size="icon"
                className={view === "categorie" ? "bg-accent" : ""}
                onClick={() => setView("categorie")}
                title="Categorie-weergave"
              >
                <LayoutGrid className="h-4 w-4" />
              </NestoButton>
              <NestoButton
                variant="ghost"
                size="icon"
                className={view === "week" ? "bg-accent" : ""}
                onClick={() => setView("week")}
                title="Weekweergave"
              >
                <CalendarDays className="h-4 w-4" />
              </NestoButton>
            </div>
          </div>
        }
      />

      <ModuleSubNav items={KEUKEN_SUBNAV} />

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <NestoButton variant="ghost" size="icon" onClick={goPrev} className="h-11 w-11">
          <ChevronLeft className="h-5 w-5" />
        </NestoButton>
        <button
          onClick={goToday}
          className="text-sm font-medium capitalize min-w-[180px] text-center"
        >
          {dateLabel}
          {isToday && <span className="ml-2 text-xs text-primary font-normal">(vandaag)</span>}
        </button>
        <NestoButton variant="ghost" size="icon" onClick={goNext} className="h-11 w-11">
          <ChevronRight className="h-5 w-5" />
        </NestoButton>
      </div>

      {closedInfo.closed && !closedInfo.unknown && (
        <div className="flex gap-3 rounded-card border border-[hsl(38_92%_50%/0.3)] bg-[hsl(48_96%_53%/0.08)] p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-[hsl(38_92%_50%)] flex-shrink-0" />
          <div className="flex-1 space-y-0.5">
            <p className="font-medium text-foreground">
              Locatie gesloten op deze dag{closedInfo.label ? ` — ${closedInfo.label}` : ""}
            </p>
            <p className="text-muted-foreground text-xs">
              Bestaande taken blijven zichtbaar. Nieuwe taken vragen bevestiging.
            </p>
          </div>
        </div>
      )}

      {view === "week" ? (
        <MepWeekView
          tasks={weekTasks}
          currentDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setView("categorie");
          }}
          onTaskClick={(task) => {
            if (task.status === "pending" || task.status === "in_progress") {
              setCompletionTask(task);
            }
          }}
          isLoading={weekLoading}
        />
      ) : (
        <>
          <MepQuickAdd
            taskDate={selectedDate}
            dayTasks={dayTasks}
            isClosedOnSelectedDate={closedInfo.closed && !closedInfo.unknown}
            closedLabel={closedInfo.label}
          />

          <MepCategoryView
              dayTasks={sortedDayTasks}
              onComplete={setCompletionTask}
              onCancel={(id) => cancelTask.mutate(id)}
              onPriorityChange={handlePriorityChange}
              isLoading={dayLoading}
            />

          <WasteModal open={wasteOpen} onOpenChange={setWasteOpen} />
          <PersoneelsmaaltijdModal open={personeelOpen} onOpenChange={setPersoneelOpen} />
        </>
      )}

      {completionTask && (
        <MepCompletionModal
          task={completionTask}
          open={!!completionTask}
          onOpenChange={(open) => {
            if (!open) setCompletionTask(null);
          }}
        />
      )}

      <MepDayPlan
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        tasks={dayTasks}
        selectedDate={selectedDate}
        onApply={setPlanOrder}
      />
    </div>
  );
}
