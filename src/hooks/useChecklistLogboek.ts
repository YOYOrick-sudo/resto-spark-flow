import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useOperatingHours, type OperatingDay } from "./useOperatingHours";
import type { ChecklistItem, TemplateModus } from "./useChecklistTemplates";
import type { ChecklistResponse, SnapshotItem } from "./useChecklistRuns";

export interface AfgerondeRun {
  id: string;
  location_id: string;
  template_id: string;
  datum: string;
  status: "afgerond";
  shift: string | null;
  afgerond_door: string | null;
  afgerond_op: string | null;
  gestart_op: string | null;
  items_snapshot: SnapshotItem[] | null;
  template?: {
    id: string;
    naam: string;
    type: string;
    items: ChecklistItem[];
    modus: TemplateModus;
    frequentie: string;
    frequentie_config: Record<string, any>;
    default_time: string | null;
    gearchiveerd_op: string | null;
  };
  afgerond_door_profile?: { id: string; name: string | null } | null;
  responses: ChecklistResponse[];
}

export interface DayBucket {
  date: string;          // YYYY-MM-DD
  runs: AfgerondeRun[];
  isClosed: boolean;
  closedLabel: string | null;
}

export interface UseChecklistLogboekResult {
  runs: AfgerondeRun[];
  schedule: OperatingDay[];
  byDate: Map<string, DayBucket>;
  isLoading: boolean;
}

/**
 * Logboek data: afgeronde runs + operating-schedule voor een datumbereik.
 * Eén roundtrip per range-wissel.
 */
export function useChecklistLogboek(range: { from: string; to: string }): UseChecklistLogboekResult {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const runsQuery = useQuery({
    queryKey: ["checklist-logboek", locationId, range.from, range.to],
    enabled: !!locationId && !!range.from && !!range.to,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: runs, error } = await supabase
        .from("checklist_runs")
        .select(
          `*,
           template:checklist_templates!template_id(id, naam, type, items, modus, frequentie, frequentie_config, default_time, gearchiveerd_op),
           afgerond_door_profile:profiles!checklist_runs_afgerond_door_fkey(id, name)`
        )
        .eq("location_id", locationId!)
        .eq("status", "afgerond")
        .gte("datum", range.from)
        .lte("datum", range.to)
        .order("datum", { ascending: true });
      if (error) throw error;

      const runIds = (runs ?? []).map((r: any) => r.id);
      let responses: any[] = [];
      if (runIds.length > 0) {
        const { data, error: rErr } = await supabase
          .from("checklist_responses")
          .select("*")
          .in("run_id", runIds);
        if (rErr) throw rErr;
        responses = data ?? [];
      }

      const responseMap = new Map<string, ChecklistResponse[]>();
      responses.forEach((r) => {
        if (!responseMap.has(r.run_id)) responseMap.set(r.run_id, []);
        responseMap.get(r.run_id)!.push(r);
      });

      return (runs ?? []).map((r: any) => ({
        ...r,
        template: r.template
          ? {
              ...r.template,
              items: (typeof r.template.items === "string"
                ? JSON.parse(r.template.items)
                : r.template.items) as ChecklistItem[],
              modus: (r.template.modus ?? "gebundeld") as TemplateModus,
              frequentie_config: r.template.frequentie_config ?? {},
              gearchiveerd_op: r.template.gearchiveerd_op ?? null,
            }
          : undefined,
        items_snapshot: r.items_snapshot ?? null,
        responses: responseMap.get(r.id) ?? [],
      })) as AfgerondeRun[];
    },
  });

  const scheduleQuery = useOperatingHours(locationId, range, "general");

  const byDate = new Map<string, DayBucket>();

  // Init buckets vanuit schedule (zodat ook lege gesloten dagen in de map zitten)
  for (const d of scheduleQuery.data ?? []) {
    const existing = byDate.get(d.date);
    const isClosedDay = d.is_closed === true;
    if (existing) {
      existing.isClosed = existing.isClosed || isClosedDay;
      if (isClosedDay && d.label) existing.closedLabel = d.label;
    } else {
      byDate.set(d.date, {
        date: d.date,
        runs: [],
        isClosed: isClosedDay,
        closedLabel: isClosedDay ? d.label : null,
      });
    }
  }

  for (const r of runsQuery.data ?? []) {
    const key = r.datum;
    let bucket = byDate.get(key);
    if (!bucket) {
      bucket = { date: key, runs: [], isClosed: false, closedLabel: null };
      byDate.set(key, bucket);
    }
    bucket.runs.push(r);
  }

  return {
    runs: runsQuery.data ?? [],
    schedule: scheduleQuery.data ?? [],
    byDate,
    isLoading: runsQuery.isLoading || scheduleQuery.isLoading,
  };
}
