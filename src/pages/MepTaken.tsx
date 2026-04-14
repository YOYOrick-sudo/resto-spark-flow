import { useState, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { PageHeader, EmptyState } from "@/components/polar";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { ChevronLeft, ChevronRight, CalendarDays, List, ClipboardList } from "lucide-react";
import { useMepTasks, useMepTasksWeek, type MepTask } from "@/hooks/useMepTasks";
import { useCancelMepTask } from "@/hooks/useMepMutations";
import { MepQuickAdd } from "@/components/mep/MepQuickAdd";
import { MepWeekView } from "@/components/mep/MepWeekView";
import { MepCompletionModal } from "@/components/mep/MepCompletionModal";
import { MepOvertijdGroup } from "@/components/mep/MepOvertijdGroup";
import { MepCategoryGroup } from "@/components/mep/MepCategoryGroup";
import { MepCompletedGroup } from "@/components/mep/MepCompletedGroup";

export default function MepTaken() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<"dag" | "week">("dag");

  // Date navigation
  const goToday = () => setSelectedDate(today);
  const goPrev = () =>
    setSelectedDate(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"));
  const goNext = () =>
    setSelectedDate(format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"));

  // Queries
  const { data: dayTasks = [], isLoading: dayLoading } = useMepTasks(selectedDate);

  const weekStartStr = format(
    startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const weekEndStr = format(
    endOfWeek(new Date(selectedDate), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const { data: weekTasks = [], isLoading: weekLoading } = useMepTasksWeek(
    weekStartStr,
    weekEndStr
  );

  // Mutations
  const cancelTask = useCancelMepTask();

  // Completion modal
  const [completionTask, setCompletionTask] = useState<MepTask | null>(null);

  // 3-layer grouping
  const { overtijd, openGrouped, voltooid, stats } = useMemo(() => {
    const now = new Date();

    const isOverdue = (t: MepTask) => {
      if (!t.deadline || t.status === "completed" || t.status === "cancelled") return false;
      const [h, m] = t.deadline.split(":").map(Number);
      const dl = new Date();
      dl.setHours(h, m, 0, 0);
      return now > dl;
    };

    const overtijd = dayTasks.filter(isOverdue);
    const overtijdIds = new Set(overtijd.map((t) => t.id));

    const activeTasks = dayTasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled" && !overtijdIds.has(t.id)
    );
    const voltooid = dayTasks.filter((t) => t.status === "completed");

    // Group open by category
    const groups: Record<string, MepTask[]> = {};
    activeTasks.forEach((t) => {
      const key = t.category || "overig";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    // Stats: exclude cancelled
    const nonCancelled = dayTasks.filter((t) => t.status !== "cancelled");
    const completed = nonCancelled.filter((t) => t.status === "completed").length;

    return {
      overtijd,
      openGrouped: groups,
      voltooid,
      stats: { completed, total: nonCancelled.length },
    };
  }, [dayTasks]);

  const isToday = selectedDate === today;
  const dateLabel = format(new Date(selectedDate), "EEEE d MMMM", { locale: nl });
  const progressPct = stats.total > 0 ? stats.completed / stats.total : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="MEP Taken"
        subtitle="Mise-en-place taken voor de keuken."
        actions={
          <div className="flex items-center gap-2">
            {stats.total > 0 && (
              <NestoBadge variant={progressPct > 0.5 ? "success" : "pending"}>
                {stats.completed}/{stats.total} klaar
              </NestoBadge>
            )}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <NestoButton
                variant="ghost"
                size="icon"
                className={view === "dag" ? "bg-accent" : ""}
                onClick={() => setView("dag")}
                title="Dagweergave"
              >
                <List className="h-4 w-4" />
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
          {isToday && (
            <span className="ml-2 text-xs text-primary font-normal">(vandaag)</span>
          )}
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
            setView("dag");
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
          {/* Quick add */}
          <MepQuickAdd taskDate={selectedDate} />

          {/* Day view content */}
          {dayLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : dayTasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Geen taken voor deze dag"
              description="Voeg taken toe via het zoekveld hierboven."
            />
          ) : (
            <div className="space-y-4">
              {/* Layer 1: Overtijd */}
              <MepOvertijdGroup
                tasks={overtijd}
                onComplete={setCompletionTask}
                onCancel={(id) => cancelTask.mutate(id)}
              />

              {/* Layer 2: Open per category */}
              {Object.entries(openGrouped).map(([category, tasks]) => (
                <MepCategoryGroup
                  key={category}
                  category={category}
                  tasks={tasks}
                  onComplete={setCompletionTask}
                  onCancel={(id) => cancelTask.mutate(id)}
                />
              ))}

              {/* Layer 3: Completed today */}
              <MepCompletedGroup tasks={voltooid} />
            </div>
          )}
        </>
      )}

      {/* Completion modal */}
      {completionTask && (
        <MepCompletionModal
          task={completionTask}
          open={!!completionTask}
          onOpenChange={(open) => {
            if (!open) setCompletionTask(null);
          }}
        />
      )}
    </div>
  );
}
