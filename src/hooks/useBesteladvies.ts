import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface AdviesRegel {
  ingredient_id: string;
  ingredient_naam: string;
  eenheid: string;
  voorraad: number;
  min_voorraad: number;
  tekort: number;
  advies_hoeveelheid: number;
  leverancier_id: string | null;
  leverancier_naam: string | null;
  artikel_id: string | null;
  artikel_naam: string | null;
  verpakking_hoeveelheid: number | null;
  verpakking_eenheid: string | null;
  prijs_per_verpakking: number | null;
  aantal_verpakkingen: number | null;
  geschatte_prijs: number | null;
}

export interface AdviesGroep {
  leverancier_id: string | null;
  leverancier_naam: string;
  regels: AdviesRegel[];
  totaal: number;
}

export function useBesteladvies() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["besteladvies", locationId],
    queryFn: async () => {
      // Get location buffer percentage
      const { data: locData } = await supabase
        .from("locations")
        .select("besteladvies_buffer_percentage")
        .eq("id", locationId!)
        .single();
      const bufferMultiplier = 1 + ((locData?.besteladvies_buffer_percentage ?? 20) / 100);

      // Get ingredients below minimum
      const { data: ingredienten, error: iErr } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, voorraad, min_voorraad")
        .eq("location_id", locationId!)
        .eq("is_archived", false);
      if (iErr) throw iErr;

      const onderMin = (ingredienten ?? []).filter(
        (i) => i.voorraad < i.min_voorraad
      );
      if (onderMin.length === 0) return [];

      // Get supplier articles for these ingredients
      const ids = onderMin.map((i) => i.id);
      const { data: artikelen, error: aErr } = await supabase
        .from("leveranciers_artikelen")
        .select("*, leveranciers(id, naam)")
        .in("ingredient_id", ids)
        .eq("is_actief", true);
      if (aErr) throw aErr;

      // Build advies regels
      const artikelMap = new Map<string, any>();
      (artikelen ?? []).forEach((a) => {
        // pick first active article per ingredient
        if (!artikelMap.has(a.ingredient_id)) artikelMap.set(a.ingredient_id, a);
      });

      const regels: AdviesRegel[] = onderMin.map((ing) => {
        const tekort = ing.min_voorraad - ing.voorraad;
        const buffer = tekort * bufferMultiplier;
        const artikel = artikelMap.get(ing.id);
        const verpH = artikel?.verpakking_hoeveelheid ?? null;
        const aantalVerp = verpH ? Math.ceil(buffer / verpH) : null;
        const advies = aantalVerp && verpH ? aantalVerp * verpH : Math.ceil(buffer);

        return {
          ingredient_id: ing.id,
          ingredient_naam: ing.naam,
          eenheid: ing.eenheid,
          voorraad: ing.voorraad,
          min_voorraad: ing.min_voorraad,
          tekort,
          advies_hoeveelheid: advies,
          leverancier_id: artikel ? (artikel.leveranciers as any)?.id ?? null : null,
          leverancier_naam: artikel ? (artikel.leveranciers as any)?.naam ?? null : null,
          artikel_id: artikel?.id ?? null,
          artikel_naam: artikel?.artikel_naam ?? null,
          verpakking_hoeveelheid: verpH,
          verpakking_eenheid: artikel?.verpakking_eenheid ?? null,
          prijs_per_verpakking: artikel?.prijs_per_verpakking ?? null,
          aantal_verpakkingen: aantalVerp,
          geschatte_prijs:
            aantalVerp && artikel?.prijs_per_verpakking
              ? aantalVerp * artikel.prijs_per_verpakking
              : null,
        };
      });

      // Group by leverancier
      const groepen = new Map<string, AdviesGroep>();
      regels.forEach((r) => {
        const key = r.leverancier_id ?? "__geen__";
        if (!groepen.has(key)) {
          groepen.set(key, {
            leverancier_id: r.leverancier_id,
            leverancier_naam: r.leverancier_naam ?? "Geen leverancier",
            regels: [],
            totaal: 0,
          });
        }
        const g = groepen.get(key)!;
        g.regels.push(r);
        g.totaal += r.geschatte_prijs ?? 0;
      });

      return Array.from(groepen.values());
    },
    enabled: !!locationId,
    staleTime: 0, // always refetch when requested
  });
}
