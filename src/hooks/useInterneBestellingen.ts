import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useEffect } from "react";

export interface InterneBestelling {
  id: string;
  organization_id: string;
  van_location_id: string;
  naar_location_id: string;
  status: string;
  aangevraagd_door: string | null;
  aangevraagd_op: string;
  geaccepteerd_op: string | null;
  verzonden_op: string | null;
  ontvangen_op: string | null;
  gewenste_datum: string | null;
  notities: string | null;
  created_at: string;
  updated_at: string;
  van_location: { id: string; name: string } | null;
  naar_location: { id: string; name: string } | null;
  aanvrager: { id: string; display_name: string | null } | null;
  regels: InterneBestelRegel[];
}

export interface InterneBestelRegel {
  id: string;
  bestelling_id: string;
  ingredient_id: string | null;
  recept_id: string | null;
  omschrijving: string;
  gevraagde_hoeveelheid: number;
  geaccepteerde_hoeveelheid: number | null;
  verzonden_hoeveelheid: number | null;
  ontvangen_hoeveelheid: number | null;
  eenheid: string;
}

export function useInterneBestellingen() {
  const { currentLocation, context } = useUserContext();
  const locationId = currentLocation?.id;
  const orgId = context?.organization_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["interne-bestellingen", orgId],
    queryFn: async () => {
      const { data: bestellingen, error } = await supabase
        .from("interne_bestellingen")
        .select(`
          *,
          van_location:locations!interne_bestellingen_van_location_id_fkey(id, name),
          naar_location:locations!interne_bestellingen_naar_location_id_fkey(id, name),
          aanvrager:profiles!interne_bestellingen_aangevraagd_door_fkey(id, display_name)
        `)
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ids = (bestellingen ?? []).map((b: any) => b.id);
      if (ids.length === 0) return { inkomend: [], uitgaand: [] };

      const { data: regels, error: rErr } = await supabase
        .from("interne_bestelregels")
        .select("*")
        .in("bestelling_id", ids);

      if (rErr) throw rErr;

      const regelMap = new Map<string, InterneBestelRegel[]>();
      (regels ?? []).forEach((r: any) => {
        if (!regelMap.has(r.bestelling_id)) regelMap.set(r.bestelling_id, []);
        regelMap.get(r.bestelling_id)!.push(r);
      });

      const enriched: InterneBestelling[] = (bestellingen ?? []).map((b: any) => ({
        ...b,
        regels: regelMap.get(b.id) ?? [],
      }));

      return {
        inkomend: enriched.filter((b) => b.naar_location_id === locationId),
        uitgaand: enriched.filter((b) => b.van_location_id === locationId),
      };
    },
    enabled: !!orgId && !!locationId,
  });

  // Realtime via broadcast
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`transfers:${orgId}`)
      .on('broadcast', { event: 'transfer_updated' }, () => {
        queryClient.invalidateQueries({ queryKey: ['interne-bestellingen', orgId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  return query;
}
