import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export interface Medewerker {
  id: string;
  location_id: string;
  naam: string;
  rol: string | null;
  email: string | null;
  is_actief: boolean;
  laatst_actief: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const LOCALSTORAGE_KEY = "nesto-laatst-medewerker";

export function getLastMedewerkerId(): string | null {
  try { return localStorage.getItem(LOCALSTORAGE_KEY); } catch { return null; }
}

export function setLastMedewerkerId(id: string) {
  try { localStorage.setItem(LOCALSTORAGE_KEY, id); } catch {}
}

export function useMedewerkers(onlyActive = true) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["medewerkers", locationId, onlyActive],
    queryFn: async () => {
      if (!locationId) return [];
      let q = supabase
        .from("medewerkers")
        .select("*")
        .eq("location_id", locationId)
        .order("naam");
      if (onlyActive) q = q.eq("is_actief", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Medewerker[];
    },
    enabled: !!locationId,
  });
}

export function useCreateMedewerker() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: { naam: string; rol?: string; email?: string }) => {
      if (!currentLocation?.id) throw new Error("Geen locatie");
      const { error } = await supabase.from("medewerkers").insert({
        location_id: currentLocation.id,
        naam: input.naam,
        rol: input.rol || null,
        email: input.email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medewerkers"] });
      
    },
    onError: (e: Error) => nestoToast.error("Aanmaken mislukt", e.message),
  });
}

export function useUpdateMedewerker() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; naam?: string; rol?: string; email?: string; is_actief?: boolean }) => {
      const { id, ...updates } = input;
      const { error } = await supabase.from("medewerkers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medewerkers"] });
      
    },
    onError: (e: Error) => nestoToast.error("Bijwerken mislukt", e.message),
  });
}
