import * as React from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { cn } from "@/lib/utils";
import type { AfwijkingStatus } from "@/hooks/useConfirmGoodsReceipt";

export interface AfwijkingValue {
  status: Exclude<AfwijkingStatus, "akkoord">;
  hoeveelheid_ontvangen?: number;
  afwijking_notitie?: string;
  /** Bij beschadigd/verkeerd: chef wil het tóch accepteren. */
  accepted_with_issue?: boolean;
}

export interface AfwijkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productNaam: string;
  hoeveelheidVerwacht: number | null;
  eenheid: string | null;
  /** Voor bewerken: huidige waarde. Bij null = nieuwe afwijking. */
  initial?: AfwijkingValue | null;
  onSubmit: (value: AfwijkingValue) => void;
}

const OPTIES: Array<{
  status: AfwijkingValue["status"];
  label: string;
  desc: string;
  needsAantal?: boolean;
  needsAccept?: boolean;
}> = [
  {
    status: "afwijking_missing",
    label: "Niet geleverd",
    desc: "Het product zit niet in de levering.",
  },
  {
    status: "afwijking_beschadigd",
    label: "Beschadigd",
    desc: "Verpakking kapot, product koud-broken of zichtbare schade.",
    needsAccept: true,
  },
  {
    status: "afwijking_verkeerd",
    label: "Verkeerd product",
    desc: "Een ander artikel dan besteld.",
    needsAccept: true,
  },
  {
    status: "afwijking_meer",
    label: "Meer geleverd",
    desc: "Méér ontvangen dan op de bon staat.",
    needsAantal: true,
  },
];

// "Anders" mappen we naar 'beschadigd' (vrije notitie verplicht). Cleanere mapping
// volgt eventueel in 2D als backend een 'afwijking_anders' enum krijgt.
const ANDERS_OPTIE = {
  status: "afwijking_beschadigd" as const,
  label: "Anders",
  desc: "Anders dan bovenstaande — beschrijf hieronder.",
};

export function AfwijkingModal({
  open,
  onOpenChange,
  productNaam,
  hoeveelheidVerwacht,
  eenheid,
  initial,
  onSubmit,
}: AfwijkingModalProps) {
  const [selected, setSelected] = React.useState<AfwijkingValue["status"] | "anders" | null>(null);
  const [aantal, setAantal] = React.useState<string>("");
  const [notitie, setNotitie] = React.useState<string>("");
  const [accepted, setAccepted] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      // Bepaal of 'anders' actief was (heuristiek: status=beschadigd zonder needsAccept-flag in UI is niet detecteerbaar; we vallen terug op echte status)
      setSelected(initial.status);
      setAantal(initial.hoeveelheid_ontvangen != null ? String(initial.hoeveelheid_ontvangen) : "");
      setNotitie(initial.afwijking_notitie ?? "");
      setAccepted(initial.accepted_with_issue ?? false);
    } else {
      setSelected(null);
      setAantal("");
      setNotitie("");
      setAccepted(false);
    }
  }, [open, initial]);

  const activeOptie = React.useMemo(() => {
    if (selected === "anders") return ANDERS_OPTIE;
    return OPTIES.find((o) => o.status === selected) ?? null;
  }, [selected]);

  const isAnders = selected === "anders";

  const aantalNum = aantal === "" ? null : Number(aantal);
  const aantalValid =
    !activeOptie?.needsAantal ||
    (aantalNum !== null && !Number.isNaN(aantalNum) && aantalNum > 0);
  const notitieValid = !isAnders || notitie.trim().length >= 3;
  const canSubmit = !!activeOptie && aantalValid && notitieValid;

  const handleSubmit = () => {
    if (!activeOptie || !canSubmit) return;
    const value: AfwijkingValue = {
      status: activeOptie.status,
      afwijking_notitie: notitie.trim() || undefined,
    };
    if (activeOptie.needsAantal && aantalNum !== null) {
      value.hoeveelheid_ontvangen = aantalNum;
    }
    if (activeOptie.needsAccept && accepted) {
      value.accepted_with_issue = true;
    }
    onSubmit(value);
    onOpenChange(false);
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title="Wat is er mis?"
      description={`${productNaam}${
        hoeveelheidVerwacht != null ? ` · verwacht ${hoeveelheidVerwacht} ${eenheid ?? ""}` : ""
      }`}
      size="md"
    >
      <div className="space-y-4">
        {/* Opties */}
        <div className="space-y-2">
          {OPTIES.map((o) => (
            <button
              key={o.status + o.label}
              type="button"
              onClick={() => setSelected(o.status)}
              className={cn(
                "w-full text-left px-4 py-3.5 rounded-xl border transition-colors min-h-[60px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === o.status
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted/40"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center",
                    selected === o.status ? "border-primary" : "border-muted-foreground/40"
                  )}
                  aria-hidden
                >
                  {selected === o.status && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium text-foreground">{o.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
                </div>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelected("anders")}
            className={cn(
              "w-full text-left px-4 py-3.5 rounded-xl border transition-colors min-h-[60px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isAnders
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:bg-muted/40"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center",
                  isAnders ? "border-primary" : "border-muted-foreground/40"
                )}
                aria-hidden
              >
                {isAnders && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium text-foreground">{ANDERS_OPTIE.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ANDERS_OPTIE.desc}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Aantal-veld bij minder/meer */}
        {activeOptie?.needsAantal && (
          <div className="border-t border-border/50 pt-4 space-y-1.5">
            <label className="text-small font-medium text-foreground block">
              {activeOptie.status === "afwijking_meer" ? "Aantal méér ontvangen" : "Aantal werkelijk ontvangen"}
            </label>
            <div className="flex items-stretch gap-2">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={aantal}
                onChange={(e) => setAantal(e.target.value)}
                placeholder="0"
                className={cn(
                  "flex-1 min-h-[56px] px-4 rounded-xl border border-input bg-background",
                  "text-h3 font-semibold text-center",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                )}
              />
              <div className="min-h-[56px] px-4 rounded-xl bg-muted flex items-center text-body font-medium text-muted-foreground">
                {eenheid ?? "stuks"}
              </div>
            </div>
          </div>
        )}

        {/* Wel accepteren toggle bij beschadigd/verkeerd */}
        {activeOptie?.needsAccept && (
          <div className="border-t border-border/50 pt-4">
            <button
              type="button"
              onClick={() => setAccepted((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition-colors min-h-[60px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                accepted ? "border-success bg-success/5" : "border-border bg-background"
              )}
            >
              <div className="flex-1 min-w-0 text-left">
                <p className="text-small font-medium text-foreground">
                  {accepted ? "Wel accepteren" : "Afwijzen (default)"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {accepted
                    ? "Product gaat op voorraad. Credit-note blijft staan voor compensatie."
                    : "Product gaat niet op voorraad. Credit-note wordt aangevraagd."}
                </p>
              </div>
              <div
                className={cn(
                  "relative h-7 w-12 rounded-full flex-shrink-0 transition-colors",
                  accepted ? "bg-success" : "bg-muted-foreground/30"
                )}
                aria-hidden
              >
                <div
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-sm transition-transform",
                    accepted ? "translate-x-[22px]" : "translate-x-0.5"
                  )}
                />
              </div>
            </button>
          </div>
        )}

        {/* Notitie */}
        {activeOptie && (
          <div className={cn(activeOptie.needsAantal || activeOptie.needsAccept ? "" : "border-t border-border/50 pt-4", "space-y-1.5")}>
            <label className="text-small font-medium text-foreground block">
              Notitie {isAnders && <span className="text-error">*</span>}
            </label>
            <textarea
              value={notitie}
              onChange={(e) => setNotitie(e.target.value)}
              placeholder={
                isAnders
                  ? "Beschrijf de afwijking (verplicht, min. 3 tekens)"
                  : "Optioneel — extra context voor klacht-email"
              }
              rows={3}
              maxLength={2000}
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-input bg-background",
                "text-small text-foreground resize-none",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              )}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton onClick={handleSubmit} disabled={!canSubmit}>
            Afwijking opslaan
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}
