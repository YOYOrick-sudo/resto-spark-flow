import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear,
  startOfToday, addMonths, addWeeks, addDays, addYears, format, getYear, isSameDay,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, NestoButton, Spinner } from "@/components/polar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChecklistLogboek } from "@/hooks/useChecklistLogboek";
import { LogboekMonthGrid } from "@/components/taken/LogboekMonthGrid";
import { LogboekYearGrid } from "@/components/taken/LogboekYearGrid";
import { LogboekWeekStrip } from "@/components/taken/LogboekWeekStrip";
import { LogboekDagPanel } from "@/components/taken/LogboekDagPanel";

type ViewMode = "jaar" | "maand" | "week" | "dag";

export default function TakenLogboek() {
  const navigate = useNavigate();
  const today = startOfToday();
  const [viewMode, setViewMode] = useState<ViewMode>("maand");
  const [anchorDate, setAnchorDate] = useState<Date>(today);
  const [panelDate, setPanelDate] = useState<Date | null>(null);

  const range = useMemo(() => {
    let from: Date, to: Date;
    if (viewMode === "jaar") { from = startOfYear(anchorDate); to = endOfYear(anchorDate); }
    else if (viewMode === "maand") { from = startOfMonth(anchorDate); to = endOfMonth(anchorDate); }
    else if (viewMode === "week") { from = startOfWeek(anchorDate, { weekStartsOn: 1 }); to = endOfWeek(anchorDate, { weekStartsOn: 1 }); }
    else { from = anchorDate; to = anchorDate; }
    return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
  }, [viewMode, anchorDate]);

  const { byDate, isLoading } = useChecklistLogboek(range);

  // Voor dag-view: gebruik anchorDate direct als panel-datum
  const panelOpen = panelDate !== null || viewMode === "dag";
  const effectivePanelDate = panelDate ?? (viewMode === "dag" ? anchorDate : null);
  const effectiveBucket = effectivePanelDate ? byDate.get(format(effectivePanelDate, "yyyy-MM-dd")) : undefined;

  function navigatePrev() {
    if (viewMode === "jaar") setAnchorDate(addYears(anchorDate, -1));
    else if (viewMode === "maand") setAnchorDate(addMonths(anchorDate, -1));
    else if (viewMode === "week") setAnchorDate(addWeeks(anchorDate, -1));
    else setAnchorDate(addDays(anchorDate, -1));
  }
  function navigateNext() {
    if (viewMode === "jaar") setAnchorDate(addYears(anchorDate, 1));
    else if (viewMode === "maand") setAnchorDate(addMonths(anchorDate, 1));
    else if (viewMode === "week") setAnchorDate(addWeeks(anchorDate, 1));
    else setAnchorDate(addDays(anchorDate, 1));
  }
  function goToday() { setAnchorDate(today); }

  const periodLabel = useMemo(() => {
    if (viewMode === "jaar") return format(anchorDate, "yyyy");
    if (viewMode === "maand") return format(anchorDate, "MMMM yyyy", { locale: nl });
    if (viewMode === "week") {
      const s = startOfWeek(anchorDate, { weekStartsOn: 1 });
      const e = endOfWeek(anchorDate, { weekStartsOn: 1 });
      return `${format(s, "d MMM", { locale: nl })} – ${format(e, "d MMM yyyy", { locale: nl })}`;
    }
    return format(anchorDate, "EEEE d MMMM yyyy", { locale: nl });
  }, [viewMode, anchorDate]);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/taken")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Taken
      </button>

      <PageHeader
        title="Logboek"
        subtitle="Audit-bewijs van afgeronde checklists"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="jaar">Jaar</TabsTrigger>
            <TabsTrigger value="maand">Maand</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="dag">Dag</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
            aria-label="Vorige"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium capitalize tabular-nums min-w-[180px] text-center">
            {periodLabel}
          </div>
          <button
            onClick={navigateNext}
            className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
            aria-label="Volgende"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isSameDay(anchorDate, today) && (
            <NestoButton variant="ghost" onClick={goToday}>Vandaag</NestoButton>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          {viewMode === "jaar" && (
            <LogboekYearGrid
              year={getYear(anchorDate)}
              byDate={byDate}
              onSelectMonth={(m) => { setAnchorDate(m); setViewMode("maand"); }}
            />
          )}
          {viewMode === "maand" && (
            <LogboekMonthGrid
              anchorDate={anchorDate}
              byDate={byDate}
              onSelectDate={(d) => setPanelDate(d)}
            />
          )}
          {viewMode === "week" && (
            <LogboekWeekStrip
              anchorDate={anchorDate}
              byDate={byDate}
              onSelectDate={(d) => setPanelDate(d)}
            />
          )}
          {viewMode === "dag" && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Bekijk de details in het zijpaneel.
            </div>
          )}
        </>
      )}

      <LogboekDagPanel
        open={panelOpen}
        onClose={() => {
          setPanelDate(null);
          if (viewMode === "dag") setViewMode("maand");
        }}
        date={effectivePanelDate}
        bucket={effectiveBucket}
      />
    </div>
  );
}
