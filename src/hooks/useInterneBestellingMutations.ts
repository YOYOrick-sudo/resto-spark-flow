import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { nestoToast } from "@/lib/nestoToast";

interface NieuweRegel {
  ingredient_id?: string | null;
  recept_id?: string | null;
  omschrijving: string;
  gevraagde_hoeveelheid: number;
  eenheid: string;
}

interface CreateInput {
  naar_location_id: string;
  gewenste_datum?: string | null;
  notities?: string | null;
  regels: NieuweRegel[];
}

export function useInterneBestellingMutations() {
  const { currentLocation, context } = useUserContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = context?.organization_id;

  const broadcast = async () => {
    if (!orgId) return;
    await supabase.channel(`transfers:${orgId}`).send({
      type: 'broadcast',
      event: 'transfer_updated',
      payload: {},
    });
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["interne-bestellingen", orgId] });
  };

  const createBestelling = useMutation({
    mutationFn: async (input: CreateInput) => {
      // van_location_id = de vestiging die levert (gekozen door gebruiker)
      // naar_location_id = de aanvrager (huidige locatie)
      const { data: bestelling, error } = await supabase
        .from("interne_bestellingen")
        .insert({
          organization_id: orgId!,
          van_location_id: input.naar_location_id,
          naar_location_id: currentLocation!.id,
          aangevraagd_door: user!.id,
          gewenste_datum: input.gewenste_datum ?? null,
          notities: input.notities ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      const regelsToInsert = input.regels.map((r) => ({
        bestelling_id: bestelling.id,
        ingredient_id: r.ingredient_id ?? null,
        recept_id: r.recept_id ?? null,
        omschrijving: r.omschrijving,
        gevraagde_hoeveelheid: r.gevraagde_hoeveelheid,
        eenheid: r.eenheid,
      }));

      const { error: rErr } = await supabase
        .from("interne_bestelregels")
        .insert(regelsToInsert);

      if (rErr) throw rErr;
      return bestelling;
    },
    onSuccess: async () => {
      nestoToast.success("Aanvraag verstuurd");
      invalidate();
      await broadcast();
    },
    onError: (e) => nestoToast.error(`Fout: ${e.message}`),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("interne_bestellingen")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async (_, { status }) => {
      const messages: Record<string, string> = {
        geaccepteerd: "Bestelling geaccepteerd",
        verzonden: "Bestelling als verzonden gemarkeerd",
        ontvangen: "Bestelling ontvangen",
        geannuleerd: "Bestelling geannuleerd",
      };
      nestoToast.success(messages[status] ?? "Status bijgewerkt");
      invalidate();
      await broadcast();
    },
    onError: (e) => nestoToast.error(`Fout: ${e.message}`),
  });

  const updateRegelHoeveelheden = useMutation({
    mutationFn: async (
      updates: { id: string; field: string; value: number }[]
    ) => {
      for (const u of updates) {
        const { error } = await supabase
          .from("interne_bestelregels")
          .update({ [u.field]: u.value })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      invalidate();
      await broadcast();
    },
    onError: (e) => nestoToast.error(`Fout: ${e.message}`),
  });

  return { createBestelling, updateStatus, updateRegelHoeveelheden };
}
