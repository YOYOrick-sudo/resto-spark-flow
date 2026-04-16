import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface DeviceRow {
  id: string;
  device_name: string;
  device_role: string;
  status: string;
  location_id: string;
  location_naam?: string;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  paired_at: string | null;
  last_heartbeat: string | null;
  app_version: string | null;
  created_at: string;
}

/**
 * Devices binnen huidige organisatie (cross-location).
 * Refetcht elke 30s zodat verlopende pairing-codes en heartbeats up-to-date blijven.
 */
export function useDevices() {
  const { currentLocation } = useUserContext();
  const orgId = currentLocation?.organization_id;

  return useQuery({
    queryKey: ["devices", orgId],
    queryFn: async (): Promise<DeviceRow[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("devices")
        .select("*, locations!inner(name, organization_id)")
        .eq("locations.organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        location_naam: d.locations?.name ?? "—",
      }));
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });
}
