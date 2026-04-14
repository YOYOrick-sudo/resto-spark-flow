import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { toast } from "sonner";

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
      toast.success("Gerecht aangemaakt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateGerecht = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from("gerechten").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
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
      // Fix 4: fetch kostprijs_snapshot
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
          snapshot = (data as any).totale_kostprijs / Math.max((data as any).porties ?? 1, 1);
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
      toast.success("Component toegevoegd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateComponent = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; hoeveelheid?: number; eenheid?: string }) => {
      const { error } = await supabase.from("gerecht_componenten").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gerecht_componenten").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Component verwijderd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActief = useMutation({
    mutationFn: async ({ id, is_actief }: { id: string; is_actief: boolean }) => {
      const { error } = await supabase.from("gerechten").update({ is_actief } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
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
      toast.success("Gerecht gearchiveerd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createGerecht, updateGerecht, addComponent, updateComponent, removeComponent, toggleActief, archiveerGerecht };
}
