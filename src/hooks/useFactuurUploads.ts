import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface FactuurUploadRow {
  id: string;
  location_id: string;
  bestandsnaam: string;
  bestand_url: string;
  bron: string;
  status: string;
  leverancier_id: string | null;
  leverancier_naam_herkend: string | null;
  factuurnummer: string | null;
  factuurdatum: string | null;
  totaalbedrag: number | null;
  goedgekeurd_door: string | null;
  goedgekeurd_op: string | null;
  created_at: string;
  updated_at: string;
  leverancier_naam?: string;
}

export function useFactuurUploads(filters?: { status?: string; leverancierId?: string }) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["factuur-uploads", locationId, filters],
    queryFn: async () => {
      let query = supabase
        .from("factuur_uploads")
        .select("*, leveranciers(naam)")
        .eq("location_id", locationId!)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.leverancierId) query = query.eq("leverancier_id", filters.leverancierId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        ...f,
        leverancier_naam: f.leveranciers?.naam ?? f.leverancier_naam_herkend ?? "Onbekend",
      })) as FactuurUploadRow[];
    },
    enabled: !!locationId,
  });
}
