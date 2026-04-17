import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { nestoToast } from "@/lib/nestoToast";
import { normalizeIngredientNaam } from "@/lib/stringUtils";

export function useFactuurMutations() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const locId = currentLocation?.id;

  const uploadFactuur = useMutation({
    mutationFn: async (values: {
      file: File;
      leverancierId?: string;
      fileHash?: string;
    }) => {
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
          file_hash: values.fileHash ?? null,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
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
      eenheid: string;         // basiseenheid (kg/L/stuk/...)
      kostprijs?: number;      // R3.5 — prijs per basiseenheid (berekend of overschreven)
      min_voorraad?: number;
      aliasNaam?: string;
      leverancierId?: string | null;
      artikelnummer?: string | null;
      // R3.5 — verpakking-info voor leveranciers_artikelen
      verpakkingHoeveelheid?: number | null;
      verpakkingEenheid?: string | null;
      prijsPerVerpakking?: number | null;
    }) => {
      if (!locId) throw new Error("Geen locatie");

      const cleanNaam = normalizeIngredientNaam(vars.naam);

      // 1. Maak ingrediënt — kostprijs is altijd per basiseenheid
      const { data: ing, error: iErr } = await supabase
        .from("ingredienten")
        .insert({
          location_id: locId,
          naam: cleanNaam,
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

      // 3. Alias opslaan (best effort) — rauwe factuur-naam, NIET genormaliseerd
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

      // 4. Upsert leveranciers_artikelen — R3.5: zowel verpakking-prijs als per-basiseenheid prijs.
      const artNr = vars.artikelnummer?.trim();
      if (vars.leverancierId && artNr) {
        const { error: laErr } = await supabase
          .from("leveranciers_artikelen")
          .upsert(
            {
              leverancier_id: vars.leverancierId,
              artikel_nummer: artNr,
              ingredient_id: ing.id,
              artikel_naam: cleanNaam,
              prijs_per_eenheid: vars.kostprijs ?? null,         // per basiseenheid (afgeleid)
              prijs_per_verpakking: vars.prijsPerVerpakking ?? null,
              verpakking_hoeveelheid: vars.verpakkingHoeveelheid ?? null,
              verpakking_eenheid: vars.verpakkingEenheid ?? null,
              is_actief: true,
              laatst_gesynchroniseerd: new Date().toISOString(),
            },
            { onConflict: "leverancier_id,artikel_nummer" }
          );
        if (laErr) {
          console.error(
            "[createNewIngredientFromFactuur leveranciers_artikelen] upsert failed:",
            laErr
          );
          throw new Error(`Leverancier-koppeling mislukt: ${laErr.message}`);
        }
      } else if (vars.leverancierId && !artNr) {
        console.warn(
          "[createNewIngredientFromFactuur] leverancier bekend maar artikelnummer ontbreekt — geen leveranciers_artikelen koppeling aangemaakt voor ingredient",
          ing.id
        );
      }

      return ing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      qc.invalidateQueries({ queryKey: ["leveranciers-artikelen"] });
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  /**
   * R4b-1 — Skip een set regels: status='skipped'. Bij goedkeuring genegeerd
   * voor voorraad/kostprijs en leveranciers_artikelen-leerlogica.
   */
  const skipRegels = useMutation({
    mutationFn: async (regelIds: string[]) => {
      if (!regelIds.length) return { count: 0 };
      const { error } = await supabase
        .from("factuur_regels")
        .update({ match_status: "skipped" })
        .in("id", regelIds);
      if (error) throw error;
      return { count: regelIds.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      if (res.count > 0) nestoToast.success(`${res.count} regel(s) overgeslagen`);
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  /**
   * R4b-1 — Bulk: maak nieuwe ingrediënten aan vanuit unmatched regels.
   * Sequentieel verwerkt (for-of) om race-conditions op
   * leveranciers_artikelen upserts te vermijden. Errors worden verzameld;
   * gedeeltelijke success wordt teruggegeven.
   */
  const bulkCreateIngredientsFromFactuur = useMutation({
    mutationFn: async (
      items: Array<{
        regelId: string;
        naam: string;
        categorie: string;
        eenheid: string;
        kostprijs?: number;
        aliasNaam?: string;
        leverancierId?: string | null;
        artikelnummer?: string | null;
        verpakkingHoeveelheid?: number | null;
        verpakkingEenheid?: string | null;
        prijsPerVerpakking?: number | null;
      }>
    ) => {
      if (!locId) throw new Error("Geen locatie");
      let success = 0;
      const errors: Array<{ naam: string; error: string }> = [];

      for (const item of items) {
        try {
          const cleanNaam = normalizeIngredientNaam(item.naam);

          // 1. INSERT ingrediënt
          const { data: ing, error: iErr } = await supabase
            .from("ingredienten")
            .insert({
              location_id: locId,
              naam: cleanNaam,
              categorie: item.categorie,
              eenheid: item.eenheid,
              kostprijs: item.kostprijs ?? null,
              kostprijs_bron: item.kostprijs ? "factuur" : null,
              kostprijs_laatst_bijgewerkt: item.kostprijs
                ? new Date().toISOString()
                : null,
              min_voorraad: 0,
            })
            .select("id")
            .single();
          if (iErr) throw iErr;

          // 2. UPDATE factuurregel
          const { error: rErr } = await supabase
            .from("factuur_regels")
            .update({
              ingredient_id: ing.id,
              match_status: "manual",
              is_nieuw_ingredient: true,
            })
            .eq("id", item.regelId);
          if (rErr) throw rErr;

          // 3. Alias (best-effort) — rauw, NIET genormaliseerd
          if (item.aliasNaam?.trim()) {
            const { error: aErr } = await supabase.rpc("record_factuur_correction", {
              p_ingredient_id: ing.id,
              p_alias_naam: item.aliasNaam.trim(),
              p_leverancier_id: item.leverancierId ?? null,
              p_artikelnummer: item.artikelnummer ?? null,
            });
            if (aErr && (aErr as any).code !== "23505") {
              console.warn("[bulk alias] failed:", aErr);
            }
          }

          // 4. UPSERT leveranciers_artikelen
          const artNr = item.artikelnummer?.trim();
          if (item.leverancierId && artNr) {
            const { error: laErr } = await supabase
              .from("leveranciers_artikelen")
              .upsert(
                {
                  leverancier_id: item.leverancierId,
                  artikel_nummer: artNr,
                  ingredient_id: ing.id,
                  artikel_naam: cleanNaam,
                  prijs_per_eenheid: item.kostprijs ?? null,
                  prijs_per_verpakking: item.prijsPerVerpakking ?? null,
                  verpakking_hoeveelheid: item.verpakkingHoeveelheid ?? null,
                  verpakking_eenheid: item.verpakkingEenheid ?? null,
                  is_actief: true,
                  laatst_gesynchroniseerd: new Date().toISOString(),
                },
                { onConflict: "leverancier_id,artikel_nummer" }
              );
            if (laErr) throw laErr;
          }

          success++;
        } catch (err: any) {
          console.error(`[bulkCreate] failed for ${item.naam}:`, err);
          errors.push({ naam: item.naam, error: err?.message ?? "Onbekend" });
        }
      }

      return { success, errors };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      qc.invalidateQueries({ queryKey: ["leveranciers-artikelen"] });
      if (res.errors.length === 0) {
        nestoToast.success(`${res.success} ingrediënten aangemaakt`);
      } else {
        nestoToast.error(
          `${res.success} aangemaakt, ${res.errors.length} gefaald. Bekijk console voor details.`
        );
      }
    },
    onError: (e: Error) => nestoToast.error(e.message),
  });

  const goedkeuren = useMutation({
    mutationFn: async (vars: { id: string; snapshot?: unknown }) => {
      const factuurId = vars.id;

      const { data: factuur, error: fErr } = await supabase
        .from("factuur_uploads")
        .select("*, factuur_regels(*)")
        .eq("id", factuurId)
        .single();
      if (fErr) throw fErr;

      // R4b-2: persist preview snapshot vóór status-update zodat signal-provider
      // de impact (grote prijswijzigingen, nieuwe ingrediënten) kan lezen.
      if (vars.snapshot) {
        const { error: snapErr } = await supabase
          .from("factuur_uploads")
          .update({ preview_snapshot: vars.snapshot as any })
          .eq("id", factuurId);
        if (snapErr) {
          console.error("[goedkeuren] preview_snapshot write failed:", snapErr);
        }
      }

      const { error: uErr } = await supabase
        .from("factuur_uploads")
        .update({
          status: "goedgekeurd" as const,
          goedgekeurd_door: user?.id,
          goedgekeurd_op: new Date().toISOString(),
        })
        .eq("id", factuurId);
      if (uErr) throw uErr;

      const regels = ((factuur as any).factuur_regels ?? []) as any[];
      const leverancierId = (factuur as any).leverancier_id as string | null;

      // R4b-1: skipped regels worden expliciet uitgesloten van voorraad/kostprijs-impact
      const matchedRegels = regels.filter(
        (r: any) =>
          r.ingredient_id &&
          r.match_status !== "skipped" &&
          (r.match_status === "matched" || r.match_status === "manual")
      );

      // R3.5 — kostprijs uit prijs_per_basiseenheid (fallback prijs_per_eenheid voor oude regels)
      let updated = 0;
      for (const regel of matchedRegels) {
        const prijs = regel.prijs_per_basiseenheid ?? regel.prijs_per_eenheid;
        if (prijs == null) continue;
        const { error } = await supabase
          .from("ingredienten")
          .update({
            kostprijs: prijs,
            kostprijs_bron: "factuur",
            kostprijs_laatst_bijgewerkt: new Date().toISOString(),
          })
          .eq("id", regel.ingredient_id);
        if (!error) updated++;
      }

      // R3: leer-loop — upsert artikelnummer→ingredient mapping zodat volgende
      // factuur van dezelfde leverancier direct via TIER 1 matcht (confidence 1.0).
      // R3.5 — uitgebreid met verpakking-velden + per-verpakking prijs
      // R4b-1 — skipped regels expliciet uitsluiten
      if (leverancierId) {
        const upsertRows = regels
          .filter(
            (r: any) =>
              r.ingredient_id &&
              r.ai_raw_artikelnummer &&
              r.match_status !== "skipped" &&
              (r.match_status === "matched" || r.match_status === "manual")
          )
          .map((r: any) => ({
            leverancier_id: leverancierId,
            artikel_nummer: String(r.ai_raw_artikelnummer).trim(),
            ingredient_id: r.ingredient_id as string,
            artikel_naam: r.product_naam_herkend ?? "Onbekend",
            prijs_per_eenheid: r.prijs_per_basiseenheid ?? r.prijs_per_eenheid ?? null,
            prijs_per_verpakking: r.prijs_per_basiseenheid != null ? r.prijs_per_eenheid : null,
            verpakking_hoeveelheid: r.verpakking_hoeveelheid ?? null,
            verpakking_eenheid: r.verpakking_eenheid ?? null,
            is_actief: true,
            laatst_gesynchroniseerd: new Date().toISOString(),
          }));

        if (upsertRows.length) {
      // R3.5 hotfix B — dedup op (leverancier_id, artikel_nummer); LAATSTE wint
      // Voorkomt Postgres 21000: "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const dedupMap = new Map<string, (typeof upsertRows)[0]>();
          for (const row of upsertRows) {
            const key = `${row.leverancier_id}|${row.artikel_nummer}`;
            dedupMap.set(key, row);
          }
          const deduped = Array.from(dedupMap.values());

          const { error: upErr } = await supabase
            .from("leveranciers_artikelen")
            .upsert(deduped, { onConflict: "leverancier_id,artikel_nummer" });
          if (upErr) {
            console.error("[goedkeuren] leveranciers_artikelen upsert failed:", upErr);
            throw new Error(`Leveranciers-koppeling bij goedkeuren mislukt: ${upErr.message}`);
          }
        }
      }

      return { updated };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factuur-detail"] });
      qc.invalidateQueries({ queryKey: ["factuur-uploads"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
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
    skipRegels,
    bulkCreateIngredientsFromFactuur,
    goedkeuren,
    afwijzen,
  };
}
