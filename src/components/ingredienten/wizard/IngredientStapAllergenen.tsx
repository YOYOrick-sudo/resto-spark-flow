import * as React from "react";
import { NestoSelect } from "@/components/polar";
import { useStepWizard } from "@/components/polar/StepWizard";
import { useAllergenen } from "@/hooks/useIngredienten";
import { AlertTriangle } from "lucide-react";

const STEP_ID = "allergenen";

const STATUS_OPTIONS = [
  { value: "onbekend", label: "Onbekend" },
  { value: "bevat", label: "Bevat" },
  { value: "kan_bevatten", label: "Kan bevatten" },
  { value: "geen", label: "Geen" },
];

export function IngredientStapAllergenen() {
  const { formData, setStepData } = useStepWizard();
  const { data: allergenen, isLoading } = useAllergenen();
  const stepData = formData[STEP_ID] ?? {};

  const getStatus = (allergeenId: string) => {
    return stepData[allergeenId] ?? "onbekend";
  };

  const setStatus = (allergeenId: string, status: string) => {
    setStepData(STEP_ID, { ...stepData, [allergeenId]: status });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tip */}
      <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Twijfel je? Kies 'Onbekend' — je kunt het later aanpassen.
        </p>
      </div>

      {/* Allergen grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allergenen?.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-4 py-3"
          >
            <span className="text-sm font-medium text-foreground">{a.naam_nl}</span>
            <div className="w-[140px] shrink-0">
              <NestoSelect
                value={getStatus(a.id)}
                onValueChange={(v) => setStatus(a.id, v)}
                options={STATUS_OPTIONS}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
