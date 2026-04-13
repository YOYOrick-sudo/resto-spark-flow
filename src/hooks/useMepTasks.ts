import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface MepTask {
  id: string;
  location_id: string;
  title: string;
  category: string;
  task_date: string;
  deadline: string | null;
  recept_id: string | null;
  methode_id: string | null;
  units: number | null;
  target_eenheid: string | null;
  prioriteit: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  recept?: { id: string; naam: string; porties: number } | null;
  methode?: {
    id: string;
    type: string;
    output_hoeveelheid: number;
    output_eenheid: string;
    visuele_eenheid: string;
    houdbaarheid: number | null;
  } | null;
  assigned_profile?: { name: string | null } | null;
}

export function useMepTasks(date: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["mep-tasks", locationId, date],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from("mep_tasks")
        .select(`
          *,
          recept:recepten(id, naam, porties),
          methode:halffabricaat_methodes(id, type, output_hoeveelheid, output_eenheid, visuele_eenheid, houdbaarheid),
          assigned_profile:profiles!mep_tasks_assigned_to_fkey(name)
        `)
        .eq("location_id", locationId)
        .eq("task_date", date)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as MepTask[];
    },
    enabled: !!locationId && !!date,
  });
}

export function useMepTasksWeek(startDate: string, endDate: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["mep-tasks-week", locationId, startDate, endDate],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from("mep_tasks")
        .select(`
          *,
          recept:recepten(id, naam, porties),
          methode:halffabricaat_methodes(id, type, output_hoeveelheid, output_eenheid, visuele_eenheid, houdbaarheid)
        `)
        .eq("location_id", locationId)
        .gte("task_date", startDate)
        .lte("task_date", endDate)
        .order("task_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as MepTask[];
    },
    enabled: !!locationId && !!startDate && !!endDate,
  });
}
