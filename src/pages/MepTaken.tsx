import { useState, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { PageHeader } from "@/components/polar";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoTabs } from "@/components/polar/NestoTabs";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { useMepTasks, useMepTasksWeek } from "@/hooks/useMepTasks";
import { MepQuickAdd } from "@/components/mep/MepQuickAdd";
import { MepTaskList } from "@/components/mep/MepTaskList";
import { MepWeekView } from "@/components/mep/MepWeekView";

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

  // Stats
  const stats = useMemo(() => {
    const pending = dayTasks.filter((t) => t.status === "pending").length;
    const completed = dayTasks.filter((t) => t.status === "completed").length;
    return { pending, completed, total: dayTasks.length };
  }, [dayTasks]);

  const isToday = selectedDate === today;
  const dateLabel = format(new Date(selectedDate), "EEEE d MMMM", {
    locale: nl,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="MEP Taken"
        subtitle="Mise-en-place taken voor de keuken."
        actions={
          <div className="flex items-center gap-2">
            {stats.total > 0 && (
              <NestoBadge variant={stats.pending === 0 ? "success" : "pending"}>
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
            <span className="ml-2 text-xs text-primary font-normal">
              (vandaag)
            </span>
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
          isLoading={weekLoading}
        />
      ) : (
        <>
          {/* Quick add */}
          <MepQuickAdd taskDate={selectedDate} />

          {/* Task list */}
          <MepTaskList tasks={dayTasks} isLoading={dayLoading} />
        </>
      )}
    </div>
  );
}
