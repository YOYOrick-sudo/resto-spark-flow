import { useState } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { useCompleteMepTask } from "@/hooks/useMepMutations";
import { useMepFavorieten, useAddMepFavoriet } from "@/hooks/useMepFavorieten";
import { Star } from "lucide-react";
import type { MepTask } from "@/hooks/useMepTasks";

interface MepCompletionModalProps {
  task: MepTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MepCompletionModal({ task, open, onOpenChange }: MepCompletionModalProps) {
  const methode = task.methode;
  const defaultUnits = task.units ?? 1;
  const verwachteGram = methode
    ? methode.output_hoeveelheid * defaultUnits
    : undefined;

  const displayEenheid = methode?.visuele_eenheid || methode?.output_eenheid;

  const [unitsGemaakt, setUnitsGemaakt] = useState(defaultUnits);
  const [werkelijkeGram, setWerkelijkeGram] = useState<string>(
    verwachteGram?.toString() ?? ""
  );
  const [temperatuur, setTemperatuur] = useState<string>("");

  const completeTask = useCompleteMepTask();
  const { data: favorieten = [] } = useMepFavorieten();
  const addFavoriet = useAddMepFavoriet();

  const isAlreadyFavoriet = favorieten.some(
    (f) => f.title === task.title
  );

  const calculatedYield =
    verwachteGram && werkelijkeGram
      ? Math.round((parseFloat(werkelijkeGram) / verwachteGram) * 100)
      : undefined;

  const handleSubmit = () => {
    completeTask.mutate(
      {
        taskId: task.id,
        task,
        unitsGemaakt,
        werkelijkeGram: werkelijkeGram ? parseFloat(werkelijkeGram) : undefined,
        yieldPercentage: calculatedYield,
        temperatuur: temperatuur ? parseFloat(temperatuur) : undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const handleSaveFavoriet = () => {
    addFavoriet.mutate({
      title: task.title,
      category: task.category || "Overig",
      recept_id: task.recept_id,
      methode_id: task.methode_id,
    });
  };

  return (
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
        <div className="flex items-center justify-between w-full">
          <div>
            {!isAlreadyFavoriet && (
              <button
                onClick={handleSaveFavoriet}
                disabled={addFavoriet.isPending}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Star className="h-3.5 w-3.5" />
                <span>Onthouden</span>
              </button>
            )}
          </div>
          <div className="flex gap-3">
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
        </div>
      }
    >
      <div className="space-y-4">
        <NestoInput
          label="Aantal gemaakt"
          type="number"
          min={1}
          value={unitsGemaakt}
          onChange={(e) => setUnitsGemaakt(Number(e.target.value))}
          className="text-lg h-14"
        />

        {verwachteGram !== undefined && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Verwachte output</p>
            <p className="text-sm font-medium">
              {(methode!.output_hoeveelheid * unitsGemaakt).toFixed(0)}{" "}
              {displayEenheid}
            </p>
          </div>
        )}

        {methode && (
          <NestoInput
            label={`Werkelijke output (${displayEenheid})`}
            type="number"
            step="0.1"
            value={werkelijkeGram}
            onChange={(e) => setWerkelijkeGram(e.target.value)}
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
  );
}
