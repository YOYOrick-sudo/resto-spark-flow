import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export interface LabelVeld {
  veld: string;
  label: string;
  actief: boolean;
  volgorde: number;
}

export interface LabelTemplate {
  id: string;
  location_id: string;
  naam: string;
  type: string;
  velden: LabelVeld[];
  label_breedte_mm: number | null;
  label_hoogte_mm: number | null;
  is_default: boolean | null;
  created_at: string | null;
}

const DEFAULT_TEMPLATES: Omit<LabelTemplate, "id" | "location_id" | "created_at">[] = [
  {
    naam: "Batch label",
    type: "batch_label",
    is_default: true,
    label_breedte_mm: 60,
    label_hoogte_mm: 40,
    velden: [
      { veld: "productnaam", label: "Product", actief: true, volgorde: 1 },
      { veld: "batch_nummer", label: "Batch", actief: true, volgorde: 2 },
      { veld: "productie_datum", label: "Bereid", actief: true, volgorde: 3 },
      { veld: "houdbaar_tot", label: "THT", actief: true, volgorde: 4 },
      { veld: "medewerker", label: "Door", actief: true, volgorde: 5 },
      { veld: "allergenen", label: "Allergenen", actief: true, volgorde: 6 },
      { veld: "gewicht", label: "Gewicht", actief: false, volgorde: 7 },
    ],
  },
  {
    naam: "Dag sticker",
    type: "dag_sticker",
    is_default: false,
    label_breedte_mm: 60,
    label_hoogte_mm: 40,
    velden: [
      { veld: "productnaam", label: "Product", actief: true, volgorde: 1 },
      { veld: "productie_datum", label: "Bereid", actief: true, volgorde: 2 },
      { veld: "houdbaar_tot", label: "THT", actief: true, volgorde: 3 },
      { veld: "medewerker", label: "Door", actief: true, volgorde: 4 },
    ],
  },
  {
    naam: "Vriezer label",
    type: "vriezer_label",
    is_default: false,
    label_breedte_mm: 60,
    label_hoogte_mm: 40,
    velden: [
      { veld: "productnaam", label: "Product", actief: true, volgorde: 1 },
      { veld: "batch_nummer", label: "Batch", actief: true, volgorde: 2 },
      { veld: "invries_datum", label: "Ingevroren", actief: true, volgorde: 3 },
      { veld: "houdbaar_tot", label: "Gebruiken voor", actief: true, volgorde: 4 },
      { veld: "medewerker", label: "Door", actief: true, volgorde: 5 },
      { veld: "gewicht", label: "Gewicht", actief: true, volgorde: 6 },
    ],
  },
];

export function useLabelTemplates() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["label-templates", locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from("label_templates")
        .select("*")
        .eq("location_id", locationId)
        .order("created_at");
      if (error) throw error;

      // Lazy seed: if no templates exist, create defaults
      if (!data || data.length === 0) {
        const inserts = DEFAULT_TEMPLATES.map((t) => ({
          location_id: locationId,
          naam: t.naam,
          type: t.type,
          velden: t.velden as any,
          label_breedte_mm: t.label_breedte_mm,
          label_hoogte_mm: t.label_hoogte_mm,
          is_default: t.is_default,
        }));
        const { data: seeded, error: seedErr } = await supabase
          .from("label_templates")
          .insert(inserts)
          .select("*");
        if (seedErr) throw seedErr;
        return (seeded ?? []).map(mapTemplate);
      }

      return data.map(mapTemplate);
    },
    enabled: !!locationId,
  });
}

function mapTemplate(row: any): LabelTemplate {
  return {
    ...row,
    velden: Array.isArray(row.velden) ? row.velden : [],
  };
}

export function useUpdateLabelTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; velden?: LabelVeld[]; is_default?: boolean; naam?: string }) => {
      const { id, ...updates } = input;
      const payload: any = {};
      if (updates.velden) payload.velden = updates.velden;
      if (updates.is_default !== undefined) payload.is_default = updates.is_default;
      if (updates.naam) payload.naam = updates.naam;
      const { error } = await supabase.from("label_templates").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["label-templates"] });
    },
    onError: (e: Error) => nestoToast.error("Template bijwerken mislukt", e.message),
  });
}
