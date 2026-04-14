import * as React from "react";
import { NestoInput } from "@/components/polar";
import { useStepWizard } from "@/components/polar/StepWizard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

const STEP_ID = "voorraad_prijs";

export function IngredientStapVoorraadPrijs() {
  const { formData, setStepData } = useStepWizard();
  const data = formData[STEP_ID] ?? {};

  const update = (field: string, value: string | number) => {
    setStepData(STEP_ID, { ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Kostprijs */}
      <div>
        <label className="mb-2 block text-label text-muted-foreground">
          Kostprijs per eenheid
        </label>
        <div className="flex">
          <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-l-[var(--radius-button)] border-[1.5px] border-r-0 border-border">
            €
          </span>
          <NestoInput
            type="number"
            step="0.01"
            min={0}
            value={data.kostprijs ?? ""}
            onChange={(e) => update("kostprijs", e.target.value)}
            placeholder="0.00"
            className="rounded-l-none border-l-0"
          />
        </div>
      </div>

      {/* Min voorraad */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-label text-muted-foreground">Minimum voorraad</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[220px] text-xs">
                Je krijgt een melding als de voorraad onder dit niveau zakt
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <NestoInput
          type="number"
          min={0}
          value={data.min_voorraad ?? ""}
          onChange={(e) => update("min_voorraad", e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Yield */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-label text-muted-foreground">Yield percentage</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[220px] text-xs">
                Welk percentage is bruikbaar na schoonmaken/schillen? Bijv. knoflook pellen = 85%
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex">
          <NestoInput
            type="number"
            min={1}
            max={100}
            value={data.yield_percentage ?? 100}
            onChange={(e) => update("yield_percentage", Number(e.target.value))}
            className="rounded-r-none border-r-0"
          />
          <span className="flex items-center px-3 bg-secondary text-muted-foreground text-sm rounded-r-[var(--radius-button)] border-[1.5px] border-l-0 border-border">
            %
          </span>
        </div>
      </div>
    </div>
  );
}
