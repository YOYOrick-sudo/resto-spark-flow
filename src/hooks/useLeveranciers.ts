import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export function useLeveranciers() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["leveranciers", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leveranciers")
        .select("*, leveranciers_artikelen(id)")
        .eq("location_id", locationId!)
        .order("naam");
      if (error) throw error;
      return (data ?? []).map((l) => ({
        ...l,
        artikel_count: (l.leveranciers_artikelen as any[])?.length ?? 0,
      }));
    },
    enabled: !!locationId,
  });
}

export interface CreateLeverancierInput {
  naam: string;
  type?: "wholesaler" | "lokaal" | "overig";
  email?: string | null;
}

export function useCreateLeverancier() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (input: CreateLeverancierInput) => {
      if (!locationId) throw new Error("Geen locatie geselecteerd");
      const { data, error } = await supabase
        .from("leveranciers")
        .insert({
          location_id: locationId,
          naam: input.naam.trim(),
          type: input.type ?? "wholesaler",
          email: input.email?.trim() || null,
          is_actief: true,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (lev) => {
      qc.invalidateQueries({ queryKey: ["leveranciers", locationId] });
      nestoToast.success("Leverancier aangemaakt", lev.naam);
    },
    onError: (err: any) => {
      nestoToast.error("Aanmaken mislukt", err?.message ?? "Onbekende fout");
    },
  });
}
