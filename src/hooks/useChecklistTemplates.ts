import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface ChecklistItem {
  id: string;
  titel: string;
  type: "check" | "temperatuur" | "notitie" | "foto";
  volgorde: number;
  vereist: boolean;
  temp_min: number | null;
  temp_max: number | null;
  frequentie: "dagelijks" | "wekelijks" | "maandelijks";
}

export interface ChecklistTemplate {
  id: string;
  location_id: string;
  naam: string;
  type: string;
  categorie: string | null;
  beschrijving: string | null;
  items: ChecklistItem[];
  actief: boolean;
  created_at: string;
  updated_at: string;
}

function makeSeedTemplates(): Array<{ naam: string; type: string; beschrijving: string; items: ChecklistItem[] }> {
  return [
    {
      naam: "Opening keuken",
      type: "opening",
      beschrijving: "Dagelijkse opening checklist",
      items: [
        { id: crypto.randomUUID(), titel: "Handen wassen", type: "check", volgorde: 1, vereist: true, temp_min: null, temp_max: null, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Werkkleding aan", type: "check", volgorde: 2, vereist: true, temp_min: null, temp_max: null, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Koeling temperatuur check", type: "temperatuur", volgorde: 3, vereist: true, temp_min: 0, temp_max: 7, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Vriezer temperatuur check", type: "temperatuur", volgorde: 4, vereist: true, temp_min: -25, temp_max: -18, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Werkbladen schoonmaken", type: "check", volgorde: 5, vereist: true, temp_min: null, temp_max: null, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Mise en place controleren", type: "check", volgorde: 6, vereist: false, temp_min: null, temp_max: null, frequentie: "dagelijks" },
      ],
    },
    {
      naam: "Sluiting keuken",
      type: "sluiting",
      beschrijving: "Dagelijkse sluiting checklist",
      items: [
        { id: crypto.randomUUID(), titel: "Werkbladen reinigen", type: "check", volgorde: 1, vereist: true, temp_min: null, temp_max: null, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Vloer dweilen", type: "check", volgorde: 2, vereist: true, temp_min: null, temp_max: null, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Koeling temperatuur check", type: "temperatuur", volgorde: 3, vereist: true, temp_min: 0, temp_max: 7, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Afval verwijderen", type: "check", volgorde: 4, vereist: true, temp_min: null, temp_max: null, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Gas/apparatuur uit", type: "check", volgorde: 5, vereist: true, temp_min: null, temp_max: null, frequentie: "dagelijks" },
        { id: crypto.randomUUID(), titel: "Lichten uit", type: "check", volgorde: 6, vereist: false, temp_min: null, temp_max: null, frequentie: "dagelijks" },
      ],
    },
    {
      naam: "Schoonmaak wekelijks",
      type: "schoonmaak",
      beschrijving: "Wekelijkse schoonmaaktaken",
      items: [
        { id: crypto.randomUUID(), titel: "Afzuigkap reinigen", type: "check", volgorde: 1, vereist: true, temp_min: null, temp_max: null, frequentie: "wekelijks" },
        { id: crypto.randomUUID(), titel: "Koeling uitruimen en schoonmaken", type: "check", volgorde: 2, vereist: true, temp_min: null, temp_max: null, frequentie: "wekelijks" },
        { id: crypto.randomUUID(), titel: "Vriezer controleren", type: "check", volgorde: 3, vereist: true, temp_min: null, temp_max: null, frequentie: "wekelijks" },
        { id: crypto.randomUUID(), titel: "Oven reinigen", type: "check", volgorde: 4, vereist: true, temp_min: null, temp_max: null, frequentie: "wekelijks" },
        { id: crypto.randomUUID(), titel: "Vuilnisbakken desinfecteren", type: "check", volgorde: 5, vereist: true, temp_min: null, temp_max: null, frequentie: "wekelijks" },
      ],
    },
  ];
}

export function useChecklistTemplates() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["checklist-templates", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("location_id", locationId!)
        .order("type")
        .order("naam");
      if (error) throw error;
      return (data ?? []) as ChecklistTemplate[];
    },
    enabled: !!locationId,
  });

  const seedTemplates = useMutation({
    mutationFn: async () => {
      const templates = makeSeedTemplates();
      const rows = templates.map((t) => ({
        location_id: locationId!,
        naam: t.naam,
        type: t.type,
        beschrijving: t.beschrijving,
        items: JSON.stringify(t.items),
      }));
      const { error } = await supabase.from("checklist_templates").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates", locationId] });
      toast.success("Standaard templates aangemaakt");
    },
    onError: () => toast.error("Fout bij aanmaken templates"),
  });

  const saveTemplate = useMutation({
    mutationFn: async (input: { id?: string; naam: string; type: string; beschrijving?: string; items: ChecklistItem[]; actief?: boolean }) => {
      const payload = {
        location_id: locationId!,
        naam: input.naam,
        type: input.type,
        beschrijving: input.beschrijving || null,
        items: JSON.stringify(input.items),
        actief: input.actief ?? true,
      };
      if (input.id) {
        const { error } = await supabase.from("checklist_templates").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("checklist_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates", locationId] });
      toast.success("Template opgeslagen");
    },
    onError: () => toast.error("Fout bij opslaan template"),
  });

  const toggleActief = useMutation({
    mutationFn: async ({ id, actief }: { id: string; actief: boolean }) => {
      const { error } = await supabase.from("checklist_templates").update({ actief }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates", locationId] }),
  });

  return { ...query, seedTemplates, saveTemplate, toggleActief };
}
