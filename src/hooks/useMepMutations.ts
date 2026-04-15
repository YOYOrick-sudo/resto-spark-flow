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
      nestoToast.success("Taak aangemaakt");
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
  werkelijkeGram?: number;
  yieldPercentage?: number;
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

      const methode = input.task.methode;

      // 1. Generate batch nummer
      const { data: batchNummer, error: batchErr } = await supabase.rpc(
        "generate_batch_nummer",
        { p_location_id: locationId }
      );
      if (batchErr) throw batchErr;

      // 2. Calculate expected gram
      const verwachteGram = methode
        ? methode.output_hoeveelheid * input.unitsGemaakt
        : undefined;

      // 3. Completion FIRST (to get completion.id)
      const { data: completion, error: compErr } = await supabase
        .from("mep_task_completions")
        .insert({
          task_id: input.taskId,
          medewerker_id: user.id,
          kok_medewerker_id: input.kokMedewerkerId || null,
          units_gemaakt: input.unitsGemaakt,
          verwachte_output_gram: verwachteGram ?? null,
          werkelijke_output_gram: input.werkelijkeGram ?? null,
          yield_percentage: input.yieldPercentage ?? null,
          temperatuur: input.temperatuur ?? null,
          batch_nummer: batchNummer as string,
        })
        .select("id")
        .single();
      if (compErr) throw compErr;

      // 4. Productie batch with task_completion_id
      if (input.task.recept_id && methode) {
        const houdbaar_tot = methode.houdbaarheid
          ? new Date(
              Date.now() + methode.houdbaarheid * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split("T")[0]
          : null;

        const { error: batchInsertErr } = await supabase
          .from("productie_batches")
          .insert({
            location_id: locationId,
            batch_nummer: batchNummer as string,
            recept_id: input.task.recept_id,
            methode_id: methode.id,
            productie_datum: new Date().toISOString().split("T")[0],
            houdbaar_tot,
            hoeveelheid: input.werkelijkeGram ?? verwachteGram ?? input.unitsGemaakt,
            eenheid: methode.output_eenheid,
            medewerker_id: user.id,
            task_completion_id: completion.id,
          });
        if (batchInsertErr) throw batchInsertErr;
      }

      // 5. Update task status
      const { error: statusErr } = await supabase
        .from("mep_tasks")
        .update({ status: "completed" })
        .eq("id", input.taskId);
      if (statusErr) throw statusErr;

      return { batchNummer: batchNummer as string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep-tasks"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
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
      nestoToast.success("Taak geannuleerd");
    },
    onError: (e: Error) => nestoToast.error("Annuleren mislukt", e.message),
  });
}
