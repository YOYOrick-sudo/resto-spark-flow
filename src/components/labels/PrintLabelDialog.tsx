import { useState, useMemo, useEffect } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { LabelPreview } from "./LabelPreview";
import { PrinterStatus } from "./PrinterStatus";
import { usePrinterConfig } from "@/hooks/usePrinterConfig";
import { useLabelTemplates, type LabelVeld } from "@/hooks/useLabelTemplates";
import { useMedewerkers, getLastMedewerkerId, setLastMedewerkerId } from "@/hooks/useMedewerkers";
import { usePrintLabel } from "@/hooks/usePrintLabel";
import { generateZPL, type LabelData, type PrintConfig } from "@/utils/zplGenerator";
import { Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrintLabelDialogProps {
  open: boolean;
  onClose: () => void;
  defaultData: Partial<LabelData>;
}

export function PrintLabelDialog({ open, onClose, defaultData }: PrintLabelDialogProps) {
  const { data: printerConfig } = usePrinterConfig();
  const { data: templates = [] } = useLabelTemplates();
  const { data: medewerkers = [] } = useMedewerkers();
  const printMutation = usePrintLabel();

  const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
  const [templateId, setTemplateId] = useState<string>("");
  const [medewerkerId, setMedewerkerId] = useState<string>("");
  const [aantal, setAantal] = useState(1);

  // Set defaults when dialog opens
  useEffect(() => {
    if (open) {
      setTemplateId(defaultTemplate?.id ?? "");
      setMedewerkerId(getLastMedewerkerId() ?? "");
      setAantal(1);
    }
  }, [open, defaultTemplate?.id]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedMedewerker = medewerkers.find((m) => m.id === medewerkerId);

  const labelData: LabelData = useMemo(() => ({
    productnaam: defaultData.productnaam ?? "",
    batch_nummer: defaultData.batch_nummer,
    productie_datum: defaultData.productie_datum ?? "",
    houdbaar_tot: defaultData.houdbaar_tot ?? "",
    medewerker: selectedMedewerker?.naam ?? defaultData.medewerker,
    allergenen: defaultData.allergenen,
    gewicht: defaultData.gewicht,
    invries_datum: defaultData.invries_datum,
  }), [defaultData, selectedMedewerker]);

  const previewZpl = useMemo(() => {
    if (!selectedTemplate) return "";
    const config: PrintConfig = {
      label_breedte_mm: printerConfig?.label_breedte_mm ?? 60,
      label_hoogte_mm: printerConfig?.label_hoogte_mm ?? 40,
      darkness: printerConfig?.print_darkness ?? 15,
      speed: printerConfig?.print_speed ?? 4,
    };
    return generateZPL(labelData, config, selectedTemplate.velden as LabelVeld[]);
  }, [labelData, selectedTemplate, printerConfig]);

  const handlePrint = () => {
    if (medewerkerId) setLastMedewerkerId(medewerkerId);
    printMutation.mutate(
      {
        labelData,
        templateId: templateId || undefined,
        medewerkerId: medewerkerId || undefined,
        aantal,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Label printen"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <PrinterStatus config={printerConfig ?? null} />
          <div className="flex gap-3">
            <NestoButton variant="outline" onClick={onClose}>Annuleren</NestoButton>
            <NestoButton
              onClick={handlePrint}
              disabled={printMutation.isPending || !printerConfig}
              isLoading={printMutation.isPending}
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print {aantal > 1 ? `(${aantal}×)` : ""}
            </NestoButton>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Left: controls */}
        <div className="space-y-4">
          {/* Template */}
          {templates.length > 0 && (
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Template</label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Kies template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Medewerker */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Bereid door</label>
            <Select value={medewerkerId} onValueChange={setMedewerkerId}>
              <SelectTrigger><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
              <SelectContent>
                {medewerkers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aantal */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Aantal labels</label>
            <NestoInput
              type="number"
              min={1}
              max={20}
              value={aantal}
              onChange={(e) => setAantal(parseInt(e.target.value) || 1)}
              className="w-24"
            />
          </div>

          {/* Label data summary */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">Labeldata</p>
            {labelData.productnaam && <DataRow label="Product" value={labelData.productnaam} />}
            {labelData.batch_nummer && <DataRow label="Batch" value={labelData.batch_nummer} />}
            {labelData.productie_datum && <DataRow label="Bereid" value={labelData.productie_datum} />}
            {labelData.houdbaar_tot && <DataRow label="THT" value={labelData.houdbaar_tot} />}
            {labelData.gewicht && <DataRow label="Gewicht" value={labelData.gewicht} />}
            {labelData.allergenen?.length ? <DataRow label="Allergenen" value={labelData.allergenen.join(", ")} /> : null}
          </div>
        </div>

        {/* Right: preview */}
        <div>
          <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Preview</label>
          <LabelPreview
            zpl={previewZpl}
            widthMm={printerConfig?.label_breedte_mm ?? 60}
            heightMm={printerConfig?.label_hoogte_mm ?? 40}
          />
          {!printerConfig && (
            <p className="text-xs text-warning mt-2">
              Geen printer geconfigureerd. Ga naar Instellingen → Keuken → Printer.
            </p>
          )}
        </div>
      </div>
    </NestoModal>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium truncate ml-2">{value}</span>
    </div>
  );
}
