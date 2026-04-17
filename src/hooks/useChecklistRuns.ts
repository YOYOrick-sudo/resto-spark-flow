import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { nestoToast } from "@/lib/nestoToast";
import type { ChecklistItem } from "./useChecklistTemplates";

export interface ChecklistResponse {
  id: string;
  run_id: string;
  item_id: string;
  type: string;
  checked: boolean | null;
  temperatuur: number | null;
  notitie: string | null;
  foto_url: string | null;
  temp_in_range: boolean | null;
  ingevuld_door: string | null;
  ingevuld_op: string | null;
}

export interface ChecklistRun {
  id: string;
  location_id: string;
  template_id: string;
  datum: string;
  shift: string | null;
  status: "open" | "bezig" | "afgerond";
  gestart_door: string | null;
  afgerond_door: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  opmerkingen: string | null;
  template?: { id: string; naam: string; type: string; items: ChecklistItem[] };
  responses: ChecklistResponse[];
}

/**
 * Een run is "bevroren" voor HACCP zodra het `freezeTime` (HH:MM[:SS]) of later
 * is op de dag NA de run-datum. Default 03:00:00 — kan per locatie geconfigureerd
 * worden via locations.haccp_freeze_tijd.
 *
 * Voorbeeld: run van 17-04, freezeTime "03:00" → bevroren vanaf 18-04 03:00.
 */
export function isRunFrozen(
  run: Pick<ChecklistRun, "datum">,
  freezeTime: string = "03:00:00"
): boolean {
  const [hStr = "3", mStr = "0", sStr = "0"] = freezeTime.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const s = parseInt(sStr, 10) || 0;
  const runDate = new Date(`${run.datum}T00:00:00`);
  const freezeAt = new Date(runDate);
  freezeAt.setDate(freezeAt.getDate() + 1);
  freezeAt.setHours(h, m, s, 0);
  return new Date() >= freezeAt;
}

export function useChecklistRuns(datum?: string) {
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();
  const today = datum || new Date().toISOString().split("T")[0];
  const queryKey = ["checklist-runs", locationId, today];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: runs, error } = await supabase
        .from("checklist_runs")
        .select(`*, template:checklist_templates(id, naam, type, items)`)
        .eq("location_id", locationId!)
        .eq("datum", today)
        .order("created_at");
      if (error) throw error;

      const runIds = (runs ?? []).map((r: any) => r.id);
      let responses: any[] = [];
      if (runIds.length > 0) {
        const { data, error: rErr } = await supabase
          .from("checklist_responses").select("*").in("run_id", runIds);
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
        template: r.template ? {
          ...r.template,
          items: (typeof r.template.items === "string"
            ? JSON.parse(r.template.items) : r.template.items) as ChecklistItem[],
        } : undefined,
        responses: responseMap.get(r.id) ?? [],
      })) as ChecklistRun[];
    },
    enabled: !!locationId,
  });

  const startDag = useMutation({
    mutationFn: async (templateIds: string[]) => {
      const rows = templateIds.map((tid) => ({
        location_id: locationId!, template_id: tid, datum: today, status: "open",
        gestart_door: user?.id ?? null, gestart_op: new Date().toISOString(),
      }));
      const { error } = await supabase.from("checklist_runs").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      nestoToast.success("Dag gestart — checklists aangemaakt");
    },
    onError: () => nestoToast.error("Fout bij starten dag"),
  });

  /**
   * OPTIMISTIC saveResponse — cache direct bijwerken, rollback bij fout.
   */
  const saveResponse = useMutation({
    mutationFn: async (input: {
      run_id: string; item_id: string; type: string;
      checked?: boolean; temperatuur?: number; notitie?: string; temp_in_range?: boolean;
    }) => {
      const { data: existing } = await supabase
        .from("checklist_responses").select("id")
        .eq("run_id", input.run_id).eq("item_id", input.item_id).maybeSingle();

      const payload = {
        run_id: input.run_id, item_id: input.item_id, type: input.type,
        checked: input.checked ?? null, temperatuur: input.temperatuur ?? null,
        notitie: input.notitie ?? null, temp_in_range: input.temp_in_range ?? null,
        ingevuld_door: user?.id ?? null, ingevuld_op: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase.from("checklist_responses")
          .update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("checklist_responses").insert(payload);
        if (error) throw error;
      }

      await supabase.from("checklist_runs")
        .update({ status: "bezig", gestart_op: new Date().toISOString(), gestart_door: user?.id })
        .eq("id", input.run_id).eq("status", "open");
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChecklistRun[]>(queryKey);
      queryClient.setQueryData<ChecklistRun[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((run) => {
          if (run.id !== input.run_id) return run;
          const existingIdx = run.responses.findIndex((r) => r.item_id === input.item_id);
          const optimistic: ChecklistResponse = {
            id: existingIdx >= 0 ? run.responses[existingIdx].id : `optimistic-${input.item_id}`,
            run_id: input.run_id, item_id: input.item_id, type: input.type,
            checked: input.checked ?? null,
            temperatuur: input.temperatuur ?? null,
            notitie: input.notitie ?? null,
            foto_url: null,
            temp_in_range: input.temp_in_range ?? null,
            ingevuld_door: user?.id ?? null,
            ingevuld_op: new Date().toISOString(),
          };
          const responses = existingIdx >= 0
            ? run.responses.map((r, i) => (i === existingIdx ? optimistic : r))
            : [...run.responses, optimistic];
          return { ...run, status: run.status === "open" ? "bezig" : run.status, responses };
        });
      });
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      nestoToast.error("Opslaan mislukt — wijziging teruggedraaid");
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
  });

  const afronden = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase.from("checklist_runs").update({
        status: "afgerond", afgerond_door: user?.id ?? null,
        afgerond_op: new Date().toISOString(),
      }).eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); },
    onError: () => nestoToast.error("Fout bij afronden"),
  });

  return { ...query, startDag, saveResponse, afronden };
}
