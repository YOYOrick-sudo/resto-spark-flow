import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { nestoToast } from "@/lib/nestoToast";

export interface TempRegistratie {
  id: string;
  location_id: string;
  locatie_naam: string;
  type: string;
  temperatuur: number;
  in_range: boolean;
  min_temp: number | null;
  max_temp: number | null;
  actie_vereist: boolean;
  actie_beschrijving: string | null;
  gemeten_door: string | null;
  gemeten_op: string;
  created_at: string;
}

export function useTemperatuurRegistraties() {
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const vandaag = useQuery({
    queryKey: ["temp-registraties-vandaag", locationId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temperatuur_registraties")
        .select("*")
        .eq("location_id", locationId!)
        .gte("gemeten_op", `${today}T00:00:00`)
        .lt("gemeten_op", `${today}T23:59:59.999`)
        .order("gemeten_op", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TempRegistratie[];
    },
    enabled: !!locationId,
  });

  const week = useQuery({
    queryKey: ["temp-registraties-week", locationId],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("temperatuur_registraties")
        .select("*")
        .eq("location_id", locationId!)
        .gte("gemeten_op", sevenDaysAgo.toISOString())
        .order("gemeten_op", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TempRegistratie[];
    },
    enabled: !!locationId,
  });

  const locatieNamen = useQuery({
    queryKey: ["temp-locatie-namen", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temperatuur_registraties")
        .select("locatie_naam")
        .eq("location_id", locationId!)
        .order("gemeten_op", { ascending: false })
        .limit(100);
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((d: any) => d.locatie_naam))];
      return unique;
    },
    enabled: !!locationId,
  });

  const registreer = useMutation({
    mutationFn: async (input: {
      locatie_naam: string;
      type: string;
      temperatuur: number;
      actie_beschrijving?: string;
    }) => {
      const { error } = await supabase.from("temperatuur_registraties").insert({
        location_id: locationId!,
        locatie_naam: input.locatie_naam,
        type: input.type,
        temperatuur: input.temperatuur,
        in_range: true, // trigger overschrijft dit
        gemeten_door: user?.id ?? null,
        actie_beschrijving: input.actie_beschrijving || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["temp-registraties-vandaag", locationId, today] });
      queryClient.invalidateQueries({ queryKey: ["temp-registraties-week", locationId] });
      queryClient.invalidateQueries({ queryKey: ["temp-locatie-namen", locationId] });
      
    },
    onError: () => nestoToast.error("Fout bij registreren"),
  });

  return { vandaag, week, locatieNamen, registreer };
}
