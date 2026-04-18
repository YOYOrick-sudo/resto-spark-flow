import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronDown, ChevronRight, Lock, CheckCircle2, Thermometer, Camera, StickyNote, CalendarDays } from "lucide-react";
import { NestoBadge } from "@/components/polar";
import { cn } from "@/lib/utils";
import type { DayBucket, AfgerondeRun } from "@/hooks/useChecklistLogboek";
import type { ChecklistItem } from "@/hooks/useChecklistTemplates";
import type { RunItem } from "@/hooks/useChecklistRuns";

interface LogboekDagDetailProps {
  date: Date | null;
  bucket: DayBucket | undefined;
}

function getRunItemsForLogboek(run: AfgerondeRun): RunItem[] {
  const all = run.template?.items ?? [];
  if (!run.items_snapshot) return all.slice().sort((a, b) => a.volgorde - b.volgorde);

  const byId = new Map(all.map((i) => [i.id, i]));
  const live: RunItem[] = [];
  const removed: RunItem[] = [];

  for (const s of run.items_snapshot) {
    const fromTpl = byId.get(s.item_id);
    if (fromTpl) {
      live.push(fromTpl);
    } else if (s.removed_item) {
      removed.push({
        id: s.item_id,
        titel: s.removed_item.titel,
        type: s.removed_item.type as ChecklistItem["type"],
        volgorde: 999_999,
        vereist: s.removed_item.vereist ?? false,
        temp_min: s.removed_item.min_temp ?? null,
        temp_max: s.removed_item.max_temp ?? null,
        foto_urls: [],
        _removed: true,
      });
    }
  }
  live.sort((a, b) => a.volgorde - b.volgorde);
  return [...live, ...removed];
}

function RunCard({ run }: { run: AfgerondeRun }) {
  const [open, setOpen] = useState(true);
  const items = getRunItemsForLogboek(run);
  const responses = new Map(run.responses.map((r) => [r.item_id, r]));
  const completedCount = items.filter((i) => {
    const r = responses.get(i.id);
    return r && (r.checked === true || r.temperatuur !== null);
  }).length;
  const naam = run.afgerond_door_profile?.name ?? "—";
  const tijd = run.afgerond_op ? format(new Date(run.afgerond_op), "HH:mm") : "—";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium truncate">{run.template?.naam ?? "Onbekend"}</div>
            {run.template?.type && (
              <NestoBadge variant="default" className="text-[10px]">{run.template.type}</NestoBadge>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            Afgerond om {tijd} door {naam}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {completedCount} van {items.length} items
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {items.map((it) => {
            const r = responses.get(it.id);
            const filled = r && (r.checked === true || r.temperatuur !== null || r.notitie);
            return (
              <div key={it.id} className={cn("p-3 flex items-start gap-3", it._removed && "bg-amber-500/5")}>
                <div className="mt-0.5">
                  {it.type === "temperatuur" ? (
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className={cn("h-4 w-4", filled ? "text-emerald-500" : "text-muted-foreground/40")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    <span className={cn(it._removed && "italic text-muted-foreground")}>{it.titel}</span>
                    {it._removed && (
                      <NestoBadge variant="warning" className="text-[10px]">Gearchiveerd</NestoBadge>
                    )}
                  </div>
                  {r?.temperatuur !== null && r?.temperatuur !== undefined && (
                    <div className="text-[12px] text-muted-foreground mt-0.5 tabular-nums">
                      {r.temperatuur} °C{r.temp_in_range === false && " — buiten bereik"}
                    </div>
                  )}
                  {r?.notitie && (
                    <div className="text-[12px] text-muted-foreground mt-0.5 flex items-start gap-1">
                      <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{r.notitie}</span>
                    </div>
                  )}
                  {r?.foto_url && (
                    <div className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Camera className="h-3 w-3" /> Foto bijgevoegd
                    </div>
                  )}
                  {r?.ingevuld_op && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      {format(new Date(r.ingevuld_op), "HH:mm")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LogboekDagDetail({ date, bucket }: LogboekDagDetailProps) {
  if (!date) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
        <CalendarDays className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
        <div className="text-sm text-muted-foreground">Selecteer een dag in de kalender</div>
      </div>
    );
  }

  const title = format(date, "EEEE d MMMM yyyy", { locale: nl });

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <h2 className="text-base font-semibold capitalize">{title}</h2>

      {bucket?.isClosed ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <div className="text-sm font-medium">Locatie gesloten op deze dag</div>
            {bucket.closedLabel && (
              <div className="text-[12px] text-muted-foreground mt-0.5">{bucket.closedLabel}</div>
            )}
          </div>
        </div>
      ) : !bucket || bucket.runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Geen afgeronde runs op deze dag.
        </div>
      ) : (
        <div className="space-y-3">
          {bucket.runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
