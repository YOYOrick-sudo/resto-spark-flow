import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { nestoToast } from "@/lib/nestoToast";

export function useVoorraadInkoopMutations() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const { user } = useAuth();
  const locId = currentLocation?.id;

  // ── Leveranciers ─────────────────────────────────────────────
  const createLeverancier = useMutation({
    mutationFn: async (values: {
      naam: string;
      type?: string;
      contactpersoon?: string;
      email?: string;
      telefoon?: string;
      klantnummer?: string;
      notities?: string;
    }) => {
      if (!locId) throw new Error("Geen locatie");
      const { data, error } = await supabase
        .from("leveranciers")
        .insert({ location_id: locId, ...values })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leveranciers"] });
      toast.success("Leverancier aangemaakt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLeverancier = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from("leveranciers").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leveranciers"] });
      qc.invalidateQueries({ queryKey: ["leverancier-detail"] });
      toast.success("Leverancier bijgewerkt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLeverancier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leveranciers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leveranciers"] });
      toast.success("Leverancier verwijderd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Artikelen ────────────────────────────────────────────────
  const createArtikel = useMutation({
    mutationFn: async (values: {
      leverancier_id: string;
      ingredient_id: string;
      artikel_naam: string;
      artikel_nummer?: string;
      ean_code?: string;
      verpakking_hoeveelheid?: number;
      verpakking_eenheid?: string;
      prijs_per_verpakking?: number;
      prijs_per_eenheid?: number;
    }) => {
      const { error } = await supabase.from("leveranciers_artikelen").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leverancier-detail"] });
      qc.invalidateQueries({ queryKey: ["leveranciers"] });
      toast.success("Artikel toegevoegd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteArtikel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leveranciers_artikelen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leverancier-detail"] });
      qc.invalidateQueries({ queryKey: ["leveranciers"] });
      toast.success("Artikel verwijderd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Bestellingen ─────────────────────────────────────────────
  const createBestelling = useMutation({
    mutationFn: async (values: {
      leverancier_id: string;
      regels: {
        ingredient_id: string;
        bestelde_hoeveelheid: number;
        eenheid: string;
        prijs_per_eenheid?: number;
        totaal?: number;
        leveranciers_artikel_id?: string;
      }[];
    }) => {
      if (!locId) throw new Error("Geen locatie");

      // Generate order number
      const { data: bnData, error: bnErr } = await supabase.rpc("generate_bestelnummer", {
        p_location_id: locId,
      });
      if (bnErr) throw bnErr;

      const totaalBedrag = values.regels.reduce((s, r) => s + (r.totaal ?? 0), 0);

      const { data: bestelling, error: bErr } = await supabase
        .from("bestellingen")
        .insert({
          location_id: locId,
          leverancier_id: values.leverancier_id,
          bestelnummer: bnData as string,
          status: "concept",
          aangemaakt_door: user?.id,
          totaal_bedrag: totaalBedrag || null,
        })
        .select("id")
        .single();
      if (bErr) throw bErr;

      const regelsToInsert = values.regels.map((r) => ({
        ...r,
        bestelling_id: bestelling.id,
      }));
      const { error: rErr } = await supabase.from("bestelregels").insert(regelsToInsert);
      if (rErr) throw rErr;

      return bestelling;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bestellingen"] });
      qc.invalidateQueries({ queryKey: ["besteladvies"] });
      toast.success("Bestellijst aangemaakt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBestelling = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from("bestellingen").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bestellingen"] });
      qc.invalidateQueries({ queryKey: ["bestelling"] });
      toast.success("Bestelling bijgewerkt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBestelling = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bestellingen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bestellingen"] });
      toast.success("Bestelling verwijderd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Bestelregels ─────────────────────────────────────────────
  const updateBestelregel = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from("bestelregels").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bestelling"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBestelregel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bestelregels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bestelling"] });
      toast.success("Regel verwijderd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBestelregel = useMutation({
    mutationFn: async (values: {
      bestelling_id: string;
      ingredient_id: string;
      bestelde_hoeveelheid: number;
      eenheid: string;
      prijs_per_eenheid?: number;
      totaal?: number;
    }) => {
      const { error } = await supabase.from("bestelregels").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bestelling"] });
      toast.success("Regel toegevoegd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Waste ────────────────────────────────────────────────────
  const createWasteRegistratie = useMutation({
    mutationFn: async (values: {
      ingredient_id?: string;
      recept_id?: string;
      omschrijving?: string;
      hoeveelheid: number;
      eenheid: string;
      categorie: string;
      reden?: string;
      geschatte_kosten?: number;
    }) => {
      if (!locId) throw new Error("Geen locatie");
      const { error } = await supabase.from("waste_registraties").insert({
        location_id: locId,
        geregistreerd_door: user?.id,
        ...values,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste-registraties"] });
      toast.success("Waste geregistreerd");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Herbestelling ────────────────────────────────────────────
  const herbestelling = useMutation({
    mutationFn: async (bestellingId: string) => {
      if (!locId) throw new Error("Geen locatie");

      // Fetch original
      const { data: orig, error: oErr } = await supabase
        .from("bestellingen")
        .select("leverancier_id, bestelregels(ingredient_id, bestelde_hoeveelheid, eenheid, prijs_per_eenheid, totaal, leveranciers_artikel_id)")
        .eq("id", bestellingId)
        .single();
      if (oErr) throw oErr;

      return createBestelling.mutateAsync({
        leverancier_id: orig.leverancier_id,
        regels: (orig.bestelregels as any[]).map((r) => ({
          ingredient_id: r.ingredient_id,
          bestelde_hoeveelheid: r.bestelde_hoeveelheid,
          eenheid: r.eenheid,
          prijs_per_eenheid: r.prijs_per_eenheid,
          totaal: r.totaal,
          leveranciers_artikel_id: r.leveranciers_artikel_id,
        })),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    createLeverancier,
    updateLeverancier,
    deleteLeverancier,
    createArtikel,
    deleteArtikel,
    createBestelling,
    updateBestelling,
    deleteBestelling,
    updateBestelregel,
    deleteBestelregel,
    addBestelregel,
    createWasteRegistratie,
    herbestelling,
  };
}
