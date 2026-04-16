import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export function useGerechtMutations() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const locId = currentLocation?.id;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["gerechten"] });
    qc.invalidateQueries({ queryKey: ["gerecht-detail"] });
    qc.invalidateQueries({ queryKey: ["gerecht-allergenen"] });
  };

  const createGerecht = useMutation({
    mutationFn: async (values: { naam: string; categorie: string; verkoopprijs?: number; omschrijving?: string | null; bereidingswijze?: string | null; foto_url?: string | null }) => {
      if (!locId) throw new Error("Geen locatie");
      const { data, error } = await supabase
        .from("gerechten")
        .insert({
          location_id: locId,
          naam: values.naam,
          categorie: values.categorie,
          verkoopprijs: values.verkoopprijs ?? null,
          omschrijving: values.omschrijving ?? null,
          bereidingswijze: values.bereidingswijze ?? null,
          foto_url: values.foto_url ?? null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      invalidate();
      
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const updateGerecht = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from("gerechten").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const addComponent = useMutation({
    mutationFn: async (values: {
      gerecht_id: string;
      type: string;
      recept_id?: string;
      ingredient_id?: string;
      hoeveelheid: number;
      eenheid: string;
    }) => {
      let snapshot: number | null = null;
      if (values.type === "ingredient" && values.ingredient_id) {
        const { data } = await supabase
          .from("ingredienten")
          .select("kostprijs")
          .eq("id", values.ingredient_id)
          .single();
        snapshot = data?.kostprijs ?? null;
      }
      if (values.type === "halffabricaat" && values.recept_id) {
        const { data } = await supabase
          .from("recepten")
          .select("totale_kostprijs, porties")
          .eq("id", values.recept_id)
          .single();
        if (data) {
          const totaal = (data as any).totale_kostprijs ?? 0;
          const porties = Math.max((data as any).porties ?? 1, 1);

          if (values.eenheid === "portie") {
            snapshot = totaal / porties;
          } else {
            // Bereken kostprijs per gekozen eenheid via methode output
            const { data: methodes } = await supabase
              .from("halffabricaat_methodes")
              .select("output_hoeveelheid, output_eenheid, type")
              .eq("recept_id", values.recept_id)
              .order("sort_order", { ascending: true });
            
            const primaire = methodes?.find((m: any) => m.type === "Bereiden") || methodes?.[0];
            if (primaire) {
              const { converteerNaarMethodeEenheid } = await import("@/utils/portieGrootte");
              const outputInEenheid = converteerNaarMethodeEenheid(
                primaire.output_hoeveelheid,
                primaire.output_eenheid,
                values.eenheid
              );
              snapshot = outputInEenheid > 0 ? totaal / outputInEenheid : totaal / porties;
            } else {
              snapshot = totaal / porties;
            }
          }
        }
      }
      const { error } = await supabase.from("gerecht_componenten").insert({
        ...values,
        kostprijs_snapshot: snapshot,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const updateComponent = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; hoeveelheid?: number; eenheid?: string }) => {
      const { error } = await supabase.from("gerecht_componenten").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const removeComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gerecht_componenten").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const toggleActief = useMutation({
    mutationFn: async ({ id, is_actief }: { id: string; is_actief: boolean }) => {
      const { error } = await supabase.from("gerechten").update({ is_actief } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const archiveerGerecht = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gerechten")
        .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      nestoToast.success("Gerecht gearchiveerd");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  return { createGerecht, updateGerecht, addComponent, updateComponent, removeComponent, toggleActief, archiveerGerecht };
}
