import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePrinterConfig } from "./usePrinterConfig";
import { useLabelTemplates } from "./useLabelTemplates";
import { generateZPL, type LabelData, type PrintConfig } from "@/utils/zplGenerator";
import { printLabel } from "@/services/printService";
import { nestoToast } from "@/lib/nestoToast";
import type { LabelVeld } from "./useLabelTemplates";

const QUICK_PRINT_KEY = "nesto-quick-print";

interface QuickPrintPreset {
  templateId: string;
  medewerkerId: string;
}

export function getQuickPrintPreset(): QuickPrintPreset | null {
  try {
    const raw = localStorage.getItem(QUICK_PRINT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setQuickPrintPreset(preset: QuickPrintPreset) {
  try { localStorage.setItem(QUICK_PRINT_KEY, JSON.stringify(preset)); } catch {}
}

export interface PrintLabelInput {
  labelData: LabelData;
  templateId?: string;
  medewerkerId?: string;
  aantal?: number;
}

export function usePrintLabel() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const { data: printerConfig } = usePrinterConfig();
  const { data: templates } = useLabelTemplates();

  return useMutation({
    mutationFn: async (input: PrintLabelInput) => {
      if (!locationId) throw new Error("Geen locatie");
      if (!printerConfig) throw new Error("Geen printer geconfigureerd");

      const template = input.templateId
        ? templates?.find((t) => t.id === input.templateId)
        : templates?.find((t) => t.is_default) ?? templates?.[0];

      if (!template) throw new Error("Geen label template gevonden");

      const config: PrintConfig = {
        label_breedte_mm: printerConfig.label_breedte_mm ?? 60,
        label_hoogte_mm: printerConfig.label_hoogte_mm ?? 40,
        darkness: printerConfig.print_darkness ?? 15,
        speed: printerConfig.print_speed ?? 4,
      };

      const zpl = generateZPL(input.labelData, config, template.velden as LabelVeld[]);
      const aantal = input.aantal ?? 1;

      // Print N copies
      for (let i = 0; i < aantal; i++) {
        const result = await printLabel(zpl, printerConfig);
        if (!result.success) {
          // Log failure
          await supabase.from("print_logs").insert({
            location_id: locationId,
            template_id: template.id,
            printer_id: printerConfig.id,
            medewerker_id: input.medewerkerId || null,
            label_data: input.labelData as any,
            zpl_output: zpl,
            status: "failed",
            error_message: result.error,
          });
          throw new Error(result.error);
        }
      }

      // Log success
      await supabase.from("print_logs").insert({
        location_id: locationId,
        template_id: template.id,
        printer_id: printerConfig.id,
        medewerker_id: input.medewerkerId || null,
        label_data: input.labelData as any,
        zpl_output: zpl,
        status: "sent",
      });

      // Update laatst_geprint
      await supabase
        .from("printer_configuraties")
        .update({ laatst_geprint: new Date().toISOString() })
        .eq("id", printerConfig.id);

      // Save quick-print preset
      if (input.templateId && input.medewerkerId) {
        setQuickPrintPreset({ templateId: input.templateId, medewerkerId: input.medewerkerId });
      }

      return { zpl, template };
    },
    onSuccess: (_, input) => {
      const n = input.aantal ?? 1;
      nestoToast.success(`${n} label${n > 1 ? "s" : ""} geprint`);
    },
    onError: (e: Error) => nestoToast.error("Printen mislukt", e.message),
  });
}
