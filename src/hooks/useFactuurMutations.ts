import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { nestoToast } from "@/lib/nestoToast";

export function useFactuurMutations() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const locId = currentLocation?.id;

  const uploadFactuur = useMutation({
    mutationFn: async (values: { file: File; leverancierId?: string }) => {
      if (!locId) throw new Error("Geen locatie");

      const ext = values.file.name.split(".").pop();
      const path = `${locId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("facturen")
        .upload(path, values.file);
      if (uploadErr) throw uploadErr;

      const { data, error } = await supabase
        .from("factuur_uploads")
        .insert({
          location_id: locId,
          bestandsnaam: values.file.name,
          bestand_url: path,
          bron: "upload" as const,
          status: "verwerken" as const,
          leverancier_id: values.leverancierId ?? null,
          ai_parsing_status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Trigger AI parse — fire-and-forget. UI luistert via realtime op factuur_uploads.
      supabase.functions
        .invoke("parse-factuur", { body: { factuurId: data.id } })
        .catch((e) => console.error("[parse-factuur] invoke failed:", e));

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-uploads"] });
      nestoToast.success("Factuur geüpload — AI leest mee...");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const linkLeverancierAlias = useMutation({
    mutationFn: async (vars: {
      factuurId: string;
      leverancierId: string;
      aliasNaam: string;
    }) => {
      // 1. Koppel factuur aan leverancier
      const { error: e1 } = await supabase
        .from("factuur_uploads")
        .update({ leverancier_id: vars.leverancierId })
        .eq("id", vars.factuurId);
      if (e1) throw e1;

      // 2. Sla alias op zodat volgende factuur auto-matcht
      if (vars.aliasNaam && vars.aliasNaam.trim().length > 0) {
        const { error: e2 } = await supabase.from("leverancier_aliassen").insert({
          leverancier_id: vars.leverancierId,
          alias_naam: vars.aliasNaam.trim(),
          bron: "handmatig",
        });
        // 23505 = unique violation → alias bestaat al, prima
        if (e2 && (e2 as any).code !== "23505") throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["factuur-uploads"] });
      nestoToast.success("Leverancier gekoppeld — volgende factuur wordt auto-herkend");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const updateFactuur = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from("factuur_uploads").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["factuur-uploads"] });
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const addRegel = useMutation({
    mutationFn: async (values: {
      factuur_id: string;
      product_naam_herkend: string;
      hoeveelheid?: number;
      eenheid?: string;
      prijs_per_eenheid?: number;
      totaal?: number;
      ingredient_id?: string;
      match_status?: string;
    }) => {
      const { error } = await supabase.from("factuur_regels").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const updateRegel = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from("factuur_regels").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const deleteRegel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("factuur_regels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const matchRegel = useMutation({
    mutationFn: async ({ regelId, ingredientId }: { regelId: string; ingredientId: string }) => {
      const { error } = await supabase
        .from("factuur_regels")
        .update({ ingredient_id: ingredientId, match_status: "manual" })
        .eq("id", regelId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const goedkeuren = useMutation({
    mutationFn: async (factuurId: string) => {
      const { data: factuur, error: fErr } = await supabase
        .from("factuur_uploads")
        .select("*, factuur_regels(*)")
        .eq("id", factuurId)
        .single();
      if (fErr) throw fErr;

      const { error: uErr } = await supabase
        .from("factuur_uploads")
        .update({
          status: "goedgekeurd" as const,
          goedgekeurd_door: user?.id,
          goedgekeurd_op: new Date().toISOString(),
        })
        .eq("id", factuurId);
      if (uErr) throw uErr;

      const matchedRegels = ((factuur as any).factuur_regels ?? []).filter(
        (r: any) =>
          r.ingredient_id &&
          (r.match_status === "matched" || r.match_status === "manual") &&
          r.prijs_per_eenheid != null
      );

      let updated = 0;
      for (const regel of matchedRegels) {
        const { error } = await supabase
          .from("ingredienten")
          .update({
            kostprijs: regel.prijs_per_eenheid,
            kostprijs_bron: "factuur",
            kostprijs_laatst_bijgewerkt: new Date().toISOString(),
          })
          .eq("id", regel.ingredient_id);
        if (!error) updated++;
      }

      return { updated };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["factuur-uploads"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      nestoToast.success(`Prijzen bijgewerkt voor ${result.updated} ingrediënten`);
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const afwijzen = useMutation({
    mutationFn: async (factuurId: string) => {
      const { error } = await supabase
        .from("factuur_uploads")
        .update({ status: "afgewezen" as const })
        .eq("id", factuurId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["factuur-uploads"] });
      nestoToast.success("Factuur afgewezen");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  return {
    uploadFactuur,
    updateFactuur,
    linkLeverancierAlias,
    addRegel,
    updateRegel,
    deleteRegel,
    matchRegel,
    goedkeuren,
    afwijzen,
  };
}
