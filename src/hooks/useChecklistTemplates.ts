import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export type Frequentie =
  | "dagelijks"
  | "wekelijks"
  | "maandelijks"
  | "kwartaal"
  | "halfjaar"
  | "jaarlijks"
  | "custom";

export type TemplateModus = "gebundeld" | "per_item";

export interface ChecklistItem {
  id: string;
  titel: string;
  type: "check" | "temperatuur" | "notitie" | "foto";
  volgorde: number;
  vereist: boolean;
  temp_min: number | null;
  temp_max: number | null;
  /**
   * @deprecated legacy veld, alleen behouden voor backwards-compat met seed-templates.
   * Per-item frequentie wordt nu via de optionele velden hieronder uitgedrukt.
   */
  frequentie?: Frequentie;
  /**
   * Eigen frequentie van het item (alleen relevant als template.modus = 'per_item').
   * Undefined → erft van template.
   */
  item_frequentie?: Frequentie;
  item_frequentie_config?: Record<string, any>;
  foto_urls?: string[];
  beschrijving?: string;
  /**
   * Optionele sectie waar dit item bij hoort. Items zonder sectie vallen onder
   * de default-sectie "Algemeen". Sectie-volgorde wordt bepaald door volgorde
   * van het eerste item per sectie.
   */
  sectie?: string;
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
  frequentie: Frequentie;
  frequentie_config: Record<string, any>;
  default_time: string | null;
  modus: TemplateModus;
  /**
   * System templates kunnen niet gearchiveerd, hernoemd of van type gewijzigd
   * worden. Wel deactiveerbaar en items zijn vrij bewerkbaar. Worden per
   * locatie automatisch geseed (Periodieke taken, Onderhoud).
   */
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Read-only helper: detecteert of een items-array per_item-frequenties bevat.
 *
 * NIET meer gebruikt in saveTemplate sinds C2e + freq-hybride sprint —
 * chef-aangemaakte templates zijn altijd 'gebundeld' (met optionele per-item
 * frequentie-override binnenin). 'per_item' is gereserveerd voor system-templates
 * (Periodieke taken, Onderhoud) die handmatig geseed worden.
 *
 * Gereserveerd voor toekomstige modus-toggle UI in de template-editor, waarmee
 * chef expliciet kan kiezen tussen gebundeld en per_item (TODO).
 */
export function detectModus(items: ChecklistItem[]): TemplateModus {
  return items.some((it) => !!it.item_frequentie) ? "per_item" : "gebundeld";
}

function makeSeedTemplates(): Array<{ naam: string; type: string; beschrijving: string; items: ChecklistItem[] }> {
  return [
    {
      naam: "Opening keuken",
      type: "opening",
      beschrijving: "Dagelijkse opening checklist",
      items: [
        { id: crypto.randomUUID(), titel: "Handen wassen", type: "check", volgorde: 1, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Werkkleding aan", type: "check", volgorde: 2, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Koeling temperatuur check", type: "temperatuur", volgorde: 3, vereist: true, temp_min: 0, temp_max: 7, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Vriezer temperatuur check", type: "temperatuur", volgorde: 4, vereist: true, temp_min: -25, temp_max: -18, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Werkbladen schoonmaken", type: "check", volgorde: 5, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Mise en place controleren", type: "check", volgorde: 6, vereist: false, temp_min: null, temp_max: null, foto_urls: [] },
      ],
    },
    {
      naam: "Sluiting keuken",
      type: "sluiting",
      beschrijving: "Dagelijkse sluiting checklist",
      items: [
        { id: crypto.randomUUID(), titel: "Werkbladen reinigen", type: "check", volgorde: 1, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Vloer dweilen", type: "check", volgorde: 2, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Koeling temperatuur check", type: "temperatuur", volgorde: 3, vereist: true, temp_min: 0, temp_max: 7, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Afval verwijderen", type: "check", volgorde: 4, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Gas/apparatuur uit", type: "check", volgorde: 5, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Lichten uit", type: "check", volgorde: 6, vereist: false, temp_min: null, temp_max: null, foto_urls: [] },
      ],
    },
    {
      naam: "Schoonmaak wekelijks",
      type: "schoonmaak",
      beschrijving: "Wekelijkse schoonmaaktaken",
      items: [
        { id: crypto.randomUUID(), titel: "Afzuigkap reinigen", type: "check", volgorde: 1, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Koeling uitruimen en schoonmaken", type: "check", volgorde: 2, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Vriezer controleren", type: "check", volgorde: 3, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Oven reinigen", type: "check", volgorde: 4, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
        { id: crypto.randomUUID(), titel: "Vuilnisbakken desinfecteren", type: "check", volgorde: 5, vereist: true, temp_min: null, temp_max: null, foto_urls: [] },
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
        .is("gearchiveerd_op", null)
        .order("type")
        .order("naam");
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        items: (typeof d.items === "string" ? JSON.parse(d.items) : d.items) as ChecklistItem[],
        frequentie: (d.frequentie ?? "dagelijks") as Frequentie,
        frequentie_config: (d.frequentie_config ?? {}) as Record<string, any>,
        default_time: d.default_time ?? null,
        modus: (d.modus ?? "gebundeld") as TemplateModus,
        is_system: d.is_system ?? false,
      })) as ChecklistTemplate[];
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
        items: t.items as any,
        frequentie: "dagelijks",
        frequentie_config: {} as any,
        default_time: null,
        modus: "gebundeld",
      }));
      const { error } = await supabase.from("checklist_templates").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates", locationId] });
    },
    onError: () => nestoToast.error("Fout bij aanmaken templates"),
  });

  const saveTemplate = useMutation({
    mutationFn: async (input: {
      id?: string;
      naam: string;
      type: string;
      beschrijving?: string;
      items: ChecklistItem[];
      actief?: boolean;
      frequentie?: Frequentie;
      frequentie_config?: Record<string, any>;
      default_time?: string | null;
    }) => {
      // Auto-detect modus: per_item zodra ≥1 item een eigen frequentie heeft
      const modus = detectModus(input.items);

      const payload = {
        location_id: locationId!,
        naam: input.naam,
        type: input.type,
        beschrijving: input.beschrijving || null,
        items: input.items as any,
        actief: input.actief ?? true,
        frequentie: input.frequentie ?? "dagelijks",
        frequentie_config: (input.frequentie_config ?? {}) as any,
        default_time: input.default_time ?? null,
        modus,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("checklist_templates")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("checklist_templates")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates", locationId] });
    },
    onError: () => nestoToast.error("Fout bij opslaan template"),
  });

  const toggleActief = useMutation({
    mutationFn: async ({ id, actief }: { id: string; actief: boolean }) => {
      const { error } = await supabase.from("checklist_templates").update({ actief }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checklist-templates", locationId] }),
  });

  const archiveTemplate = useMutation({
    mutationFn: async (id: string) => {
      // Pre-check: blokkeer archivering van system templates
      const current = queryClient.getQueryData<ChecklistTemplate[]>([
        "checklist-templates",
        locationId,
      ]);
      const target = current?.find((t) => t.id === id);
      if (target?.is_system) {
        throw new Error("System templates kunnen niet gearchiveerd worden");
      }
      const { error } = await supabase
        .from("checklist_templates")
        .update({ gearchiveerd_op: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates", locationId] });
      nestoToast.success("Template gearchiveerd");
    },
    onError: (e: any) => nestoToast.error(e?.message ?? "Fout bij archiveren"),
  });

  return { ...query, seedTemplates, saveTemplate, toggleActief, archiveTemplate };
}
