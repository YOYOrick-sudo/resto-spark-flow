import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { differenceInDays, format, addDays } from "date-fns";

export interface BijnaVerlopenItem {
  id: string;
  productnaam: string;
  recept_id: string;
  batch_nummer: string | null;
  productie_datum: string;
  verval_datum: string;
  dagen_resterend: number;
  geschatte_hoeveelheid: string;
  geschatte_waarde: number;
}

export function useBijnaVerlopen(dagen: number = 2) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["bijna-verlopen", locationId, dagen],
    queryFn: async (): Promise<BijnaVerlopenItem[]> => {
      const grens = format(addDays(new Date(), dagen), "yyyy-MM-dd");
      const vandaag = format(new Date(), "yyyy-MM-dd");

      // Fetch active batches expiring within `dagen` days, JOIN methode for output_hoeveelheid
      const { data: batches, error } = await supabase
        .from("productie_batches")
        .select(`
          id, batch_nummer, hoeveelheid, eenheid, productie_datum, houdbaar_tot, recept_id,
          recepten!productie_batches_recept_id_fkey(
            naam, porties, totale_kostprijs,
            halffabricaat_methodes!halffabricaat_methodes_recept_id_fkey(
              output_hoeveelheid, output_eenheid, type
            )
          )
        `)
        .eq("location_id", locationId!)
        .eq("status", "actief")
        .lte("houdbaar_tot", grens)
        .order("houdbaar_tot", { ascending: true });

      if (error) throw error;

      // Exclude batches for which a personeelsmaaltijd was already registered today
      const { data: wasteVandaag } = await supabase
        .from("waste_registraties")
        .select("recept_id")
        .eq("location_id", locationId!)
        .eq("categorie", "personeelsmaaltijd")
        .gte("created_at", `${vandaag}T00:00:00`);

      const vandaagReceptIds = new Set(
        (wasteVandaag ?? []).map((w: any) => w.recept_id).filter(Boolean)
      );

      const items: BijnaVerlopenItem[] = (batches ?? [])
        .filter((b) => !vandaagReceptIds.has(b.recept_id))
        .map((b) => {
          const recept = b.recepten as any;
          const dagenResterend = differenceInDays(
            new Date(b.houdbaar_tot!),
            new Date(vandaag)
          );

          // Fix 1: use halffabricaat_methodes output for correct value calculation
          const methodes = recept?.halffabricaat_methodes ?? [];
          const methode = methodes.find((m: any) => m.type === "Bereiden") ?? methodes[0];
          const outputTotal = methode?.output_hoeveelheid ?? 1;
          const totaleKostprijs = recept?.totale_kostprijs ?? 0;

          const geschatteWaarde = outputTotal > 0
            ? Math.round((b.hoeveelheid / outputTotal) * totaleKostprijs * 100) / 100
            : 0;

          return {
            id: b.id,
            productnaam: recept?.naam ?? "Onbekend",
            recept_id: b.recept_id,
            batch_nummer: b.batch_nummer,
            productie_datum: b.productie_datum,
            verval_datum: b.houdbaar_tot!,
            dagen_resterend: dagenResterend,
            geschatte_hoeveelheid: `${b.hoeveelheid} ${b.eenheid}`,
            geschatte_waarde: geschatteWaarde,
          };
        });

      return items;
    },
    enabled: !!locationId,
    refetchInterval: 5 * 60 * 1000,
  });
}
