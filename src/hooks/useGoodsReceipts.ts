import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface GoodsReceiptInboxRow {
  id: string;
  location_id: string;
  organization_id: string;
  leverancier_id: string | null;
  leverancier_naam: string | null;
  pakbon_nummer: string | null;
  levering_datum: string | null;
  ontvangst_status: string;
  ai_parse_status: string;
  ai_parse_confidence: number | null;
  notities: string | null;
  totaal_regels_verwacht: number | null;
  regels_count: number;
  has_gekoeld: boolean;
  has_vries: boolean;
  has_risicogroep: boolean;
  created_at: string;
  updated_at: string;
}

export type LeveringGroup = "vandaag" | "deze_week" | "eerder";

export interface GroupedLeveringen {
  vandaag: GoodsReceiptInboxRow[];
  deze_week: GoodsReceiptInboxRow[];
  eerder: GoodsReceiptInboxRow[];
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupForDate(leveringDatum: string | null, createdAt: string): LeveringGroup {
  const ref = leveringDatum ? new Date(leveringDatum) : new Date(createdAt);
  const today = startOfDay(new Date());
  const refDay = startOfDay(ref);
  const diffDays = Math.round((refDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "vandaag";
  if (diffDays > 0 && diffDays <= 7) return "deze_week";
  return "eerder";
}

/**
 * Inbox-query voor chef: alleen pakbonnen waarvoor AI succesvol is geweest
 * en status nog 'verwachten' (= chef moet bevestigen).
 * Group sorting: vandaag > deze week > eerder.
 */
export function useGoodsReceipts() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const qc = useQueryClient();

  useEffect(() => {
    if (!locationId) return;
    const channel = supabase
      .channel(`pakbon:${locationId}`)
      .on("broadcast", { event: "goods_receipt.updated" }, () => {
        qc.invalidateQueries({ queryKey: ["goods-receipts"] });
        qc.invalidateQueries({ queryKey: ["pakbon-badge"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, qc]);

  const query = useQuery({
    queryKey: ["goods-receipts", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipts_chef_inbox" as any)
        .select("*")
        .eq("location_id", locationId!)
        .order("levering_datum", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GoodsReceiptInboxRow[];
    },
    enabled: !!locationId,
  });

  const grouped = useMemo<GroupedLeveringen>(() => {
    const result: GroupedLeveringen = { vandaag: [], deze_week: [], eerder: [] };
    for (const row of query.data ?? []) {
      const g = groupForDate(row.levering_datum, row.created_at);
      result[g].push(row);
    }
    return result;
  }, [query.data]);

  return { ...query, grouped };
}
