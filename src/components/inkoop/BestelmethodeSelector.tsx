import { NestoSelect } from "@/components/polar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCanEditBestelmethode } from "@/hooks/useCanEditBestelmethode";
import { BESTELMETHODE_META, type BestelMethode } from "./BestelmethodeBadge";

interface Props {
  value: BestelMethode;
  onChange: (v: BestelMethode) => void;
  /** Override role-check (bijv. niet-bevoegd → altijd disabled) */
  forceDisabled?: boolean;
  showHelper?: boolean;
  className?: string;
}

const OPTIONS = (Object.keys(BESTELMETHODE_META) as BestelMethode[]).map((key) => ({
  value: key,
  label: BESTELMETHODE_META[key].label,
}));

export function BestelmethodeSelector({
  value,
  onChange,
  forceDisabled = false,
  showHelper = true,
  className,
}: Props) {
  const { canEdit, reason } = useCanEditBestelmethode();
  const disabled = forceDisabled || !canEdit;
  const meta = BESTELMETHODE_META[value];

  const select = (
    <NestoSelect
      options={OPTIONS}
      value={value}
      onValueChange={(v) => onChange(v as BestelMethode)}
      disabled={disabled}
    />
  );

  return (
    <div className={className}>
      {disabled && reason && !forceDisabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed">{select}</div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{reason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        select
      )}
      {showHelper && (
        <p className="mt-1.5 text-xs text-muted-foreground">{meta.helper}</p>
      )}
    </div>
  );
}
