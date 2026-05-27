import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";
import type { MepTask } from "./useMepTasks";

// ── Create ──────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  category: string;
  task_date: string;
  recept_id?: string | null;
  methode_id?: string | null;
  units?: number;
  prioriteit?: string;
}

export function useCreateMepTask() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!locationId) throw new Error("Geen locatie geselecteerd");
      const { error } = await supabase.from("mep_tasks").insert({
        location_id: locationId,
        title: input.title,
        category: input.category,
        task_date: input.task_date,
        recept_id: input.recept_id || null,
        methode_id: input.methode_id || null,
        units: input.units ?? 1,
        prioriteit: input.prioriteit ?? "Normaal",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep-tasks"] });
    },
    onError: (e: Error) => nestoToast.error("Aanmaken mislukt", e.message),
  });
}

// ── Update ──────────────────────────────────────────────

export interface UpdateTaskInput {
  id: string;
  title?: string;
  category?: string;
  task_date?: string;
  units?: number | null;
  prioriteit?: string;
  status?: string;
  notes?: string;
  assigned_to?: string | null;
}

export function useUpdateMepTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from("mep_tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep-tasks"] });
    },
    onError: (e: Error) => nestoToast.error("Wijzigen mislukt", e.message),
  });
}

// ── Complete ────────────────────────────────────────────

export interface CompleteTaskInput {
  taskId: string;
  task: MepTask;
  unitsGemaakt: number;
  /** Werkelijke output in de display-eenheid van de methode (bv. 1 voor "1 L"). */
  werkelijkeOutput?: number;
  /** Display-eenheid (bv. "L", "g", "st"). Default = methode.output_eenheid. */
  werkelijkeOutputUnit?: string;
  temperatuur?: number;
  kokMedewerkerId?: string;
}

export interface CompleteTaskResult {
  batchNummer: string;
}

export function useCompleteMepTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (input: CompleteTaskInput): Promise<CompleteTaskResult> => {
      if (!user) throw new Error("Niet ingelogd");
      if (!locationId) throw new Error("Geen locatie");

      // Atomic RPC: inputs (mét unit-conversie) + output booking + productie_batch
      const { data, error } = await supabase.rpc("complete_mep_task", {
        _task_id: input.taskId,
        _units_gemaakt: input.unitsGemaakt,
        _werkelijke_output: input.werkelijkeOutput ?? null,
        _werkelijke_output_unit: input.werkelijkeOutputUnit ?? null,
        _temperatuur: input.temperatuur ?? null,
        _kok_medewerker_id: input.kokMedewerkerId ?? null,
      });
      if (error) throw error;

      const result = data as { batch_nummer?: string } | null;
      return { batchNummer: result?.batch_nummer ?? "" };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep-tasks"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      qc.invalidateQueries({ queryKey: ["halffabricaten"] });
      qc.invalidateQueries({ queryKey: ["voorraad-bewegingen"] });
      nestoToast.success("Taak afgerond", "Voorraad automatisch bijgewerkt.");
    },
    onError: (e: Error) => nestoToast.error("Afronden mislukt", e.message),
  });
}


// ── Cancel ──────────────────────────────────────────────

export function useCancelMepTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("mep_tasks")
        .update({ status: "cancelled" })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep-tasks"] });
      
    },
    onError: (e: Error) => nestoToast.error("Annuleren mislukt", e.message),
  });
}
