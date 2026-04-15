import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export interface PrinterConfiguratie {
  id: string;
  location_id: string;
  naam: string;
  printer_type: string;
  print_bridge_url: string | null;
  printer_ip: string | null;
  printer_port: number | null;
  label_breedte_mm: number | null;
  label_hoogte_mm: number | null;
  print_darkness: number | null;
  print_speed: number | null;
  is_actief: boolean | null;
  laatst_geprint: string | null;
}

export function usePrinterConfig() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["printer-config", locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from("printer_configuraties")
        .select("*")
        .eq("location_id", locationId)
        .eq("is_actief", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PrinterConfiguratie | null;
    },
    enabled: !!locationId,
  });
}

export function useUpsertPrinterConfig() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: Partial<PrinterConfiguratie> & { id?: string }) => {
      if (!currentLocation?.id) throw new Error("Geen locatie");
      if (input.id) {
        const { id, ...updates } = input;
        const { error } = await supabase.from("printer_configuraties").update(updates).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("printer_configuraties").insert({
          location_id: currentLocation.id,
          naam: input.naam ?? "Keuken printer",
          printer_type: input.printer_type ?? "zebra_zd421",
          print_bridge_url: input.print_bridge_url ?? null,
          printer_ip: input.printer_ip ?? null,
          printer_port: input.printer_port ?? 9100,
          label_breedte_mm: input.label_breedte_mm ?? 60,
          label_hoogte_mm: input.label_hoogte_mm ?? 40,
          print_darkness: input.print_darkness ?? 15,
          print_speed: input.print_speed ?? 4,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["printer-config"] });
      nestoToast.success("Printer opgeslagen");
    },
    onError: (e: Error) => nestoToast.error("Opslaan mislukt", e.message),
  });
}
