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

  // ============================================================
  // R3 — Ingrediënt matching mutations
  // ============================================================

  /**
   * Koppel een factuurregel handmatig aan een bestaand ingrediënt
   * + sla alias op zodat AI het volgende keer auto-herkent.
   * leverancier-specifiek: zelfde alias bij andere leverancier matcht niet.
   */
  const linkIngredientAlias = useMutation({
    mutationFn: async (vars: {
      regelId: string;
      ingredientId: string;
      aliasNaam: string;
      leverancierId?: string | null;
      artikelnummer?: string | null;
    }) => {
      // 1. Koppel factuurregel
      const { error: e1 } = await supabase
        .from("factuur_regels")
        .update({ ingredient_id: vars.ingredientId, match_status: "manual" })
        .eq("id", vars.regelId);
      if (e1) throw e1;

      // 2. Sla alias op via SECURITY DEFINER RPC (R1)
      if (vars.aliasNaam?.trim()) {
        const { error: e2 } = await supabase.rpc("record_factuur_correction", {
          p_ingredient_id: vars.ingredientId,
          p_alias_naam: vars.aliasNaam.trim(),
          p_leverancier_id: vars.leverancierId ?? null,
          p_artikelnummer: vars.artikelnummer ?? null,
        });
        // 23505 = unique violation → alias bestaat al, prima
        if (e2 && (e2 as any).code !== "23505") {
          console.warn("[record_factuur_correction] failed:", e2);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      nestoToast.success("Ingrediënt gekoppeld — AI leert hiervan");
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  /**
   * Bevestig een AI-suggestie (medium confidence) → match_status naar "matched"
   * + sla alias op om toekomstige auto-matches te versterken.
   */
  const confirmMatch = useMutation({
    mutationFn: async (vars: {
      regelId: string;
      ingredientId: string;
      aliasNaam: string;
      leverancierId?: string | null;
      artikelnummer?: string | null;
    }) => {
      const { error } = await supabase
        .from("factuur_regels")
        .update({ match_status: "matched" })
        .eq("id", vars.regelId);
      if (error) throw error;

      if (vars.aliasNaam?.trim()) {
        const { error: aErr } = await supabase.rpc("record_factuur_correction", {
          p_ingredient_id: vars.ingredientId,
          p_alias_naam: vars.aliasNaam.trim(),
          p_leverancier_id: vars.leverancierId ?? null,
          p_artikelnummer: vars.artikelnummer ?? null,
        });
        if (aErr && (aErr as any).code !== "23505") {
          console.warn("[confirmMatch alias] failed:", aErr);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  /**
   * Bulk-bevestig alle high-confidence matches in één UPDATE.
   * Caller filtert eerst op confidence > 0.85 + match_status === "matched".
   */
  const bulkConfirmHighConfidence = useMutation({
    mutationFn: async (regelIds: string[]) => {
      if (!regelIds.length) return { count: 0 };
      const { error } = await supabase
        .from("factuur_regels")
        .update({ match_status: "matched" })
        .in("id", regelIds);
      if (error) throw error;
      return { count: regelIds.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      nestoToast.success(`${r.count} matches bevestigd`);
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  /**
   * Maak een nieuw ingrediënt aan vanuit factuurregel-context (prefill),
   * koppel het direct aan de regel, en sla alias op voor toekomstige auto-match.
   */
  const createNewIngredientFromFactuur = useMutation({
    mutationFn: async (vars: {
      regelId: string;
      naam: string;
      categorie: string;       // NOT NULL in DB
      eenheid: string;
      kostprijs?: number;
      min_voorraad?: number;
      aliasNaam?: string;
      leverancierId?: string | null;
      artikelnummer?: string | null;
    }) => {
      if (!locId) throw new Error("Geen locatie");

      // 1. Maak ingrediënt
      const { data: ing, error: iErr } = await supabase
        .from("ingredienten")
        .insert({
          location_id: locId,
          naam: vars.naam,
          categorie: vars.categorie,
          eenheid: vars.eenheid,
          kostprijs: vars.kostprijs ?? null,
          kostprijs_bron: vars.kostprijs ? "factuur" : null,
          kostprijs_laatst_bijgewerkt: vars.kostprijs ? new Date().toISOString() : null,
          min_voorraad: vars.min_voorraad ?? 0,
        })
        .select("id")
        .single();
      if (iErr) throw iErr;

      // 2. Koppel factuurregel
      const { error: rErr } = await supabase
        .from("factuur_regels")
        .update({
          ingredient_id: ing.id,
          match_status: "manual",
          is_nieuw_ingredient: true,
        })
        .eq("id", vars.regelId);
      if (rErr) throw rErr;

      // 3. Alias opslaan (best effort)
      if (vars.aliasNaam?.trim()) {
        const { error: aErr } = await supabase.rpc("record_factuur_correction", {
          p_ingredient_id: ing.id,
          p_alias_naam: vars.aliasNaam.trim(),
          p_leverancier_id: vars.leverancierId ?? null,
          p_artikelnummer: vars.artikelnummer ?? null,
        });
        if (aErr && (aErr as any).code !== "23505") {
          console.warn("[createNewIngredientFromFactuur alias] failed:", aErr);
        }
      }

      return ing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      nestoToast.success("Nieuw ingrediënt aangemaakt en gekoppeld");
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
    linkIngredientAlias,
    confirmMatch,
    bulkConfirmHighConfidence,
    createNewIngredientFromFactuur,
    goedkeuren,
    afwijzen,
  };
}
