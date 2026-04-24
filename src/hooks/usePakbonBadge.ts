import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

/**
 * Count van pakbonnen in chef-inbox: AI succesvol klaar, status nog 'verwachten'.
 * Gebruikt de view goods_receipts_chef_inbox die de filter-logica bundelt.
 * Realtime via broadcast channel `pakbon:${locationId}`, event 'goods_receipt.updated'.
 */
export function usePakbonBadge() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const qc = useQueryClient();

  useEffect(() => {
    if (!locationId) return;
    const channel = supabase
      .channel(`pakbon:${locationId}`)
      .on("broadcast", { event: "goods_receipt.updated" }, () => {
        qc.invalidateQueries({ queryKey: ["pakbon-badge"] });
        qc.invalidateQueries({ queryKey: ["goods-receipts"] });
        qc.invalidateQueries({ queryKey: ["goods-receipt-detail"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, qc]);

  return useQuery({
    queryKey: ["pakbon-badge", locationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("goods_receipts_chef_inbox" as any)
        .select("id", { count: "exact", head: true })
        .eq("location_id", locationId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!locationId,
    staleTime: 30_000,
  });
}
