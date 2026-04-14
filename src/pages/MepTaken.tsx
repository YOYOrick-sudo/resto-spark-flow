import { useState, useEffect, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { PageHeader } from "@/components/polar";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { ChevronLeft, ChevronRight, CalendarDays, List, LayoutGrid, Sparkles } from "lucide-react";
import { useMepTasks, useMepTasksWeek, type MepTask } from "@/hooks/useMepTasks";
import { useMepIngredientStock } from "@/hooks/useMepIngredientStock";
import { useCancelMepTask, useUpdateMepTask } from "@/hooks/useMepMutations";
import { MepQuickAdd } from "@/components/mep/MepQuickAdd";
import { MepWeekView } from "@/components/mep/MepWeekView";
import { MepCompletionModal } from "@/components/mep/MepCompletionModal";
import { MepPriorityView } from "@/components/mep/MepPriorityView";
import { MepCategoryView } from "@/components/mep/MepCategoryView";
import { MepDayPlan } from "@/components/mep/MepDayPlan";
import type { IngredientStockMap } from "@/utils/mepPriority";

type ViewMode = "prioriteit" | "categorie" | "week";
const STORAGE_KEY = "mep-view-preference";

function getInitialView(): ViewMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "prioriteit" || saved === "categorie" || saved === "week") return saved;
  } catch {}
  return "prioriteit";
}

export default function MepTaken() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<ViewMode>(getInitialView);
  const [planOpen, setPlanOpen] = useState(false);
  const [planOrder, setPlanOrder] = useState<string[] | null>(null);

  // Persist view preference
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, view); } catch {}
  }, [view]);

  // Reset plan order on date change
  useEffect(() => {
    setPlanOrder(null);
  }, [selectedDate]);

  // Date navigation
  const goToday = () => setSelectedDate(today);
  const goPrev = () => setSelectedDate(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"));
  const goNext = () => setSelectedDate(format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"));

  // Queries
  const { data: dayTasks = [], isLoading: dayLoading } = useMepTasks(selectedDate);

  const weekStartStr = format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: weekTasks = [], isLoading: weekLoading } = useMepTasksWeek(weekStartStr, weekEndStr);

  // Ingredient stock — only for priority view
  const { data: ingredientStock } = useMepIngredientStock(dayTasks, view === "prioriteit");
  const stockMap: IngredientStockMap = ingredientStock ?? new Map();

  // Mutations
  const cancelTask = useCancelMepTask();
  const updateTask = useUpdateMepTask();

  // Completion modal
  const [completionTask, setCompletionTask] = useState<MepTask | null>(null);

  // Priority change handler
  const handlePriorityChange = (taskId: string, prioriteit: string) => {
    updateTask.mutate({ id: taskId, prioriteit });
  };

  // Apply plan order to day tasks
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

  // Stats
  const nonCancelled = dayTasks.filter((t) => t.status !== "cancelled");
  const completedCount = nonCancelled.filter((t) => t.status === "completed").length;
  const totalCount = nonCancelled.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  // Plan button visibility
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
        subtitle="Mise-en-place taken voor de keuken."
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
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <NestoButton
                variant="ghost"
                size="icon"
                className={view === "prioriteit" ? "bg-accent" : ""}
                onClick={() => setView("prioriteit")}
                title="Prioriteitslijst"
              >
                <List className="h-4 w-4" />
              </NestoButton>
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

      {view === "week" ? (
        <MepWeekView
          tasks={weekTasks}
          currentDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setView("prioriteit");
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
          <MepQuickAdd taskDate={selectedDate} dayTasks={dayTasks} />

          {view === "prioriteit" ? (
            <MepPriorityView
              dayTasks={sortedDayTasks}
              ingredientStock={stockMap}
              onComplete={setCompletionTask}
              onCancel={(id) => cancelTask.mutate(id)}
              onPriorityChange={handlePriorityChange}
              isLoading={dayLoading}
            />
          ) : (
            <MepCategoryView
              dayTasks={sortedDayTasks}
              onComplete={setCompletionTask}
              onCancel={(id) => cancelTask.mutate(id)}
              isLoading={dayLoading}
            />
          )}
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
