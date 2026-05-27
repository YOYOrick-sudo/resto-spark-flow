import { useState, useEffect } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoNumericInput } from "@/components/polar/NestoNumericInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { useCompleteMepTask } from "@/hooks/useMepMutations";
import { useMedewerkers, getLastMedewerkerId, setLastMedewerkerId } from "@/hooks/useMedewerkers";
import { PrintLabelDialog } from "@/components/labels/PrintLabelDialog";
import { getQuickPrintPreset } from "@/hooks/usePrintLabel";
import { usePrintLabel } from "@/hooks/usePrintLabel";
import type { LabelData } from "@/utils/zplGenerator";
import type { MepTask } from "@/hooks/useMepTasks";
import { getDisplayEenheid } from "@/utils/mepDisplay";
import { Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MepCompletionModalProps {
  task: MepTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MepCompletionModal({ task, open, onOpenChange }: MepCompletionModalProps) {
  const methode = task.methode;
  const defaultUnits = task.units ?? 1;
  const verwachteOutput = methode
    ? methode.output_hoeveelheid * defaultUnits
    : undefined;

  // Display-eenheid van methode (bv. "L", "g", "st") — geen hardcoded "g"
  const outputEenheid = methode?.output_eenheid ?? "g";
  const displayEenheid = getDisplayEenheid(task) ?? outputEenheid;

  const [unitsGemaakt, setUnitsGemaakt] = useState(defaultUnits);
  const [werkelijkeOutput, setWerkelijkeOutput] = useState<string>(
    verwachteOutput?.toString() ?? ""
  );
  const [temperatuur, setTemperatuur] = useState<string>("");
  const [medewerkerId, setMedewerkerId] = useState<string>("");
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [labelData, setLabelData] = useState<Partial<LabelData>>({});

  const completeTask = useCompleteMepTask();
  const { data: medewerkers = [] } = useMedewerkers();
  const quickPrint = usePrintLabel();

  // Set default medewerker from localStorage
  useEffect(() => {
    if (open) {
      const lastId = getLastMedewerkerId();
      if (lastId && medewerkers.some((m) => m.id === lastId)) {
        setMedewerkerId(lastId);
      } else if (medewerkers.length > 0) {
        setMedewerkerId(medewerkers[0].id);
      }
    }
  }, [open, medewerkers]);

  const calculatedYield =
    verwachteOutput && werkelijkeOutput
      ? Math.round((parseFloat(werkelijkeOutput) / verwachteOutput) * 100)
      : undefined;

  const selectedMedewerker = medewerkers.find((m) => m.id === medewerkerId);

  const handleSubmit = () => {
    if (medewerkerId) setLastMedewerkerId(medewerkerId);

    completeTask.mutate(
      {
        taskId: task.id,
        task,
        unitsGemaakt,
        werkelijkeOutput: werkelijkeOutput ? parseFloat(werkelijkeOutput) : undefined,
        werkelijkeOutputUnit: outputEenheid,
        temperatuur: temperatuur ? parseFloat(temperatuur) : undefined,
        kokMedewerkerId: medewerkerId || undefined,
      },
      {
        onSuccess: (result) => {
          onOpenChange(false);

          // Prepare label data using batch_nummer from completion
          const now = new Date();
          const formatDate = (d: Date) =>
            `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;

          const houdbaarheid = methode?.houdbaarheid ?? 2;
          const thtDate = new Date(now.getTime() + houdbaarheid * 24 * 60 * 60 * 1000);

          const data: Partial<LabelData> = {
            productnaam: task.title,
            batch_nummer: result?.batchNummer ?? undefined,
            productie_datum: formatDate(now),
            houdbaar_tot: formatDate(thtDate),
            medewerker: selectedMedewerker?.naam,
            gewicht: werkelijkeOutput ? `${werkelijkeOutput} ${outputEenheid}` : undefined,
          };


          setLabelData(data);

          // Check for quick-print preset
          const preset = getQuickPrintPreset();
          if (preset && medewerkerId) {
            // Quick print — no dialog
            quickPrint.mutate({
              labelData: data as LabelData,
              templateId: preset.templateId,
              medewerkerId,
              aantal: 1,
            });
          } else {
            // Show print dialog
            setShowPrintDialog(true);
          }
        },
      }
    );
  };

  return (
    <>
      <NestoModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Afronden: ${task.title}`}
        description={
          methode
            ? `${methode.type} · ${methode.output_hoeveelheid} ${displayEenheid}`
            : undefined
        }
        footer={
          <div className="flex items-center justify-end w-full gap-3">
            <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </NestoButton>
            <NestoButton
              onClick={handleSubmit}
              disabled={completeTask.isPending || unitsGemaakt <= 0}
            >
              {completeTask.isPending ? "Bezig..." : "Afronden"}
            </NestoButton>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Medewerker */}
          <div>
            <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Bereid door</label>
            {medewerkers.length > 0 ? (
              <Select value={medewerkerId} onValueChange={setMedewerkerId}>
                <SelectTrigger><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                <SelectContent>
                  {medewerkers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nog geen medewerkers.{" "}
                <a href="/instellingen/keuken/medewerkers" className="text-primary hover:underline">Voeg toe →</a>
              </p>
            )}
          </div>

          <NestoNumericInput
            label="Aantal gemaakt"
            min={1}
            integer
            value={unitsGemaakt}
            onValueChange={(v) => setUnitsGemaakt(v ?? 1)}
            allowEmpty={false}
            fallback={1}
            className="text-lg h-14"
          />

          {verwachteOutput !== undefined && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Verwachte output</p>
              <p className="text-sm font-medium">
                {(methode!.output_hoeveelheid * unitsGemaakt).toFixed(0)}{" "}
                {outputEenheid}
              </p>
            </div>
          )}

          {methode && (
            <NestoInput
              label={`Werkelijke output (${outputEenheid})`}
              type="number"
              step="0.1"
              value={werkelijkeOutput}
              onChange={(e) => setWerkelijkeOutput(e.target.value)}
              className="text-lg h-14"
            />
          )}


          {calculatedYield !== undefined && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Yield</p>
              <p
                className={`text-sm font-medium ${
                  calculatedYield >= 90
                    ? "text-success"
                    : calculatedYield >= 70
                    ? "text-warning"
                    : "text-destructive"
                }`}
              >
                {calculatedYield}%
              </p>
            </div>
          )}

          <NestoInput
            label="Temperatuur (°C, optioneel)"
            type="number"
            step="0.1"
            value={temperatuur}
            onChange={(e) => setTemperatuur(e.target.value)}
            className="h-14"
          />
        </div>
      </NestoModal>

      <PrintLabelDialog
        open={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        defaultData={labelData}
      />
    </>
  );
}
