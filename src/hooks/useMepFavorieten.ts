import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export interface MepFavoriet {
  id: string;
  location_id: string;
  title: string;
  category: string;
  recept_id: string | null;
  methode_id: string | null;
  created_at: string;
  methode: { type: string; visuele_eenheid: string | null } | null;
}

export function useMepFavorieten() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["mep_favorieten", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mep_favorieten")
        .select("*, methode:halffabricaat_methodes!mep_favorieten_methode_id_fkey(type, visuele_eenheid)")
        .eq("location_id", locationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MepFavoriet[];
    },
  });
}

export function useAddMepFavoriet() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (input: {
      title: string;
      category: string;
      recept_id?: string | null;
      methode_id?: string | null;
    }) => {
      if (!locationId) throw new Error("Geen locatie");
      const { error } = await supabase.from("mep_favorieten").upsert(
        {
          location_id: locationId,
          title: input.title,
          category: input.category,
          recept_id: input.recept_id ?? null,
          methode_id: input.methode_id ?? null,
        },
        { onConflict: "location_id,title" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep_favorieten", locationId] });
      
    },
    onError: () => {
      nestoToast.error("Kon favoriet niet opslaan");
    },
  });
}

export function useRemoveMepFavoriet() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mep_favorieten")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep_favorieten", locationId] });
      
    },
    onError: () => {
      nestoToast.error("Kon favoriet niet verwijderen");
    },
  });
}
