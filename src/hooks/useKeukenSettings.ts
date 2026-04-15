import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export interface KeukenSettings {
  besteladvies_buffer_percentage: number | null;
  haccp_koeling_max: number | null;
  haccp_vriezer_max: number | null;
  haccp_kern_min: number | null;
  haccp_warmhouden_min: number | null;
  ingredient_categorieen: string[];
  recept_categorieen: string[];
  gerecht_categorieen: string[];
  ai_bevoegdheden_keuken: AiBevoegdheden;
  assistent_min_waarde_verlopen: number;
  assistent_min_waarde_overschot: number;
}

export interface AiBevoegdheden {
  prep_lijsten: "zelfstandig" | "vraag_eerst" | "uit";
  besteladvies: "zelfstandig" | "vraag_eerst" | "uit";
  interne_transfers: "zelfstandig" | "vraag_eerst" | "uit";
  voorraad_waarschuwingen: "zelfstandig" | "vraag_eerst" | "uit";
  haccp_waarschuwingen: "zelfstandig";
}

const DEFAULTS: KeukenSettings = {
  besteladvies_buffer_percentage: 20,
  haccp_koeling_max: 7,
  haccp_vriezer_max: -18,
  haccp_kern_min: 75,
  haccp_warmhouden_min: 60,
  ingredient_categorieen: ["Groenten", "Fruit", "Vlees", "Vis", "Zuivel", "Droge waren", "Kruiden", "Dranken", "Overig"],
  recept_categorieen: ["Sauzen", "Soepen", "Salades", "Garnituren", "Desserts", "Brood", "Overig"],
  gerecht_categorieen: ["Voorgerechten", "Hoofdgerechten", "Desserts", "Bijgerechten", "Dranken", "Overig"],
  ai_bevoegdheden_keuken: {
    prep_lijsten: "vraag_eerst",
    besteladvies: "vraag_eerst",
    interne_transfers: "uit",
    voorraad_waarschuwingen: "zelfstandig",
    haccp_waarschuwingen: "zelfstandig",
  },
};

export function useKeukenSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["keuken-settings", locationId],
    queryFn: async (): Promise<KeukenSettings> => {
      const { data, error } = await supabase
        .from("locations")
        .select("besteladvies_buffer_percentage, haccp_koeling_max, haccp_vriezer_max, haccp_kern_min, haccp_warmhouden_min, ingredient_categorieen, recept_categorieen, gerecht_categorieen, ai_bevoegdheden_keuken")
        .eq("id", locationId!)
        .single();
      if (error) throw error;
      return {
        besteladvies_buffer_percentage: data.besteladvies_buffer_percentage ?? DEFAULTS.besteladvies_buffer_percentage,
        haccp_koeling_max: (data as any).haccp_koeling_max ?? DEFAULTS.haccp_koeling_max,
        haccp_vriezer_max: (data as any).haccp_vriezer_max ?? DEFAULTS.haccp_vriezer_max,
        haccp_kern_min: (data as any).haccp_kern_min ?? DEFAULTS.haccp_kern_min,
        haccp_warmhouden_min: (data as any).haccp_warmhouden_min ?? DEFAULTS.haccp_warmhouden_min,
        ingredient_categorieen: ((data as any).ingredient_categorieen ?? DEFAULTS.ingredient_categorieen) as string[],
        recept_categorieen: ((data as any).recept_categorieen ?? DEFAULTS.recept_categorieen) as string[],
        gerecht_categorieen: ((data as any).gerecht_categorieen ?? DEFAULTS.gerecht_categorieen) as string[],
        ai_bevoegdheden_keuken: ((data as any).ai_bevoegdheden_keuken ?? DEFAULTS.ai_bevoegdheden_keuken) as AiBevoegdheden,
        assistent_min_waarde_verlopen: (data as any).assistent_min_waarde_verlopen ?? 5,
        assistent_min_waarde_overschot: (data as any).assistent_min_waarde_overschot ?? 10,
      };
    },
    enabled: !!locationId,
  });
}

export function useUpdateKeukenSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<KeukenSettings>) => {
      const { error } = await supabase
        .from("locations")
        .update(updates as any)
        .eq("id", locationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keuken-settings", locationId] });
      nestoToast.success("Keuken instellingen opgeslagen");
    },
    onError: () => {
      nestoToast.error("Fout bij opslaan instellingen");
    },
  });
}

export function useUpdateAiBevoegdheden() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bevoegdheden: AiBevoegdheden) => {
      const { error } = await supabase
        .from("locations")
        .update({ ai_bevoegdheden_keuken: bevoegdheden } as any)
        .eq("id", locationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keuken-settings", locationId] });
    },
    onError: () => {
      nestoToast.error("Fout bij opslaan bevoegdheden");
    },
  });
}
