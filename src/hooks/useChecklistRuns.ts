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
  status: string;
  gestart_door: string | null;
  afgerond_door: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  opmerkingen: string | null;
  template?: { id: string; naam: string; type: string; items: ChecklistItem[] };
  responses: ChecklistResponse[];
}

export function useChecklistRuns(datum?: string) {
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();
  const today = datum || new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["checklist-runs", locationId, today],
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
          .from("checklist_responses")
          .select("*")
          .in("run_id", runIds);
        if (rErr) throw rErr;
        responses = data ?? [];
      }

      const responseMap = new Map<string, ChecklistResponse[]>();
      responses.forEach((r: any) => {
        if (!responseMap.has(r.run_id)) responseMap.set(r.run_id, []);
        responseMap.get(r.run_id)!.push(r);
      });

      return (runs ?? []).map((r: any) => ({
        ...r,
        template: r.template ? {
          ...r.template,
          items: (typeof r.template.items === 'string'
            ? JSON.parse(r.template.items)
            : r.template.items) as ChecklistItem[]
        } : undefined,
        responses: responseMap.get(r.id) ?? [],
      })) as ChecklistRun[];
    },
    enabled: !!locationId,
  });

  const startDag = useMutation({
    mutationFn: async (templateIds: string[]) => {
      const rows = templateIds.map((tid) => ({
        location_id: locationId!,
        template_id: tid,
        datum: today,
        status: "open",
        gestart_door: user?.id ?? null,
        gestart_op: new Date().toISOString(),
      }));
      const { error } = await supabase.from("checklist_runs").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-runs", locationId, today] });
      nestoToast.success("Dag gestart — checklists aangemaakt");
    },
    onError: () => nestoToast.error("Fout bij starten dag"),
  });

  const saveResponse = useMutation({
    mutationFn: async (input: {
      run_id: string;
      item_id: string;
      type: string;
      checked?: boolean;
      temperatuur?: number;
      notitie?: string;
      temp_in_range?: boolean;
    }) => {
      const { data: existing } = await supabase
        .from("checklist_responses")
        .select("id")
        .eq("run_id", input.run_id)
        .eq("item_id", input.item_id)
        .maybeSingle();

      const payload = {
        run_id: input.run_id,
        item_id: input.item_id,
        type: input.type,
        checked: input.checked ?? null,
        temperatuur: input.temperatuur ?? null,
        notitie: input.notitie ?? null,
        temp_in_range: input.temp_in_range ?? null,
        ingevuld_door: user?.id ?? null,
        ingevuld_op: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase.from("checklist_responses").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("checklist_responses").insert(payload);
        if (error) throw error;
      }

      // Update run status to 'bezig' if still 'open'
      await supabase
        .from("checklist_runs")
        .update({ status: "bezig", gestart_op: new Date().toISOString(), gestart_door: user?.id })
        .eq("id", input.run_id)
        .eq("status", "open");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-runs", locationId, today] });
    },
  });

  const afronden = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase
        .from("checklist_runs")
        .update({
          status: "afgerond",
          afgerond_door: user?.id ?? null,
          afgerond_op: new Date().toISOString(),
        })
        .eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-runs", locationId, today] });
      
    },
    onError: () => nestoToast.error("Fout bij afronden"),
  });

  return { ...query, startDag, saveResponse, afronden };
}
