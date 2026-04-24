import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { cn } from "@/lib/utils";

const REDENEN = [
  { value: "alleen_droge_waren", label: "Alleen droge waren in deze levering" },
  { value: "thermometer_kapot", label: "Thermometer kapot of niet beschikbaar" },
  { value: "geen_tijd_truck_weg", label: "Geen tijd — vrachtwagen reed alweer weg" },
  { value: "andere_meting_gebruikt", label: "Reeds gemeten via andere methode" },
  { value: "verzegeld_pakket", label: "Verzegeld pakket — niet openen ter plekke" },
];

export interface SkipTempModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "gekoeld" of "vries" — alleen voor de titel-context. */
  type: "gekoeld" | "vries";
  onConfirm: (reden: string) => void;
}

export function SkipTempModal({ open, onOpenChange, type, onConfirm }: SkipTempModalProps) {
  const [selected, setSelected] = React.useState<string>("");
  const [custom, setCustom] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSelected("");
      setCustom("");
    }
  }, [open]);

  const isCustom = selected === "anders";
  const canSubmit = selected !== "" && (!isCustom || custom.trim().length >= 3);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const reden = isCustom ? `Anders: ${custom.trim()}` : (REDENEN.find((r) => r.value === selected)?.label ?? selected);
    onConfirm(reden);
    onOpenChange(false);
  };

  const label = type === "gekoeld" ? "gekoeld-meting" : "vries-meting";

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Temperatuur ${label} overslaan`}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-3.5">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-small text-foreground">
            Geef een reden waarom je deze temperatuur niet meet. Dit wordt
            geregistreerd voor je HACCP-logboek.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-small font-medium text-foreground">Reden</p>
          <div className="space-y-2">
            {REDENEN.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelected(r.value)}
                className={cn(
                  "w-full text-left px-4 py-3.5 rounded-xl border transition-colors min-h-[60px] flex items-center gap-3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected === r.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/40"
                )}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                    selected === r.value ? "border-primary" : "border-muted-foreground/40"
                  )}
                  aria-hidden
                >
                  {selected === r.value && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-small text-foreground">{r.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelected("anders")}
              className={cn(
                "w-full text-left px-4 py-3.5 rounded-xl border transition-colors min-h-[60px] flex items-center gap-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCustom
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted/40"
              )}
            >
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                  isCustom ? "border-primary" : "border-muted-foreground/40"
                )}
                aria-hidden
              >
                {isCustom && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
              <span className="text-small text-foreground">Anders…</span>
            </button>

            {isCustom && (
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Beschrijf de reden (min. 3 tekens)"
                rows={2}
                maxLength={200}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-input bg-background",
                  "text-small text-foreground resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                )}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton onClick={handleSubmit} disabled={!canSubmit}>
            Overslaan bevestigen
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}
