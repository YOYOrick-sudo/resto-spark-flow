import * as React from "react";
import { Check, AlertCircle, AlertTriangle, Loader2, ArrowDown } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { cn } from "@/lib/utils";

export type ConfirmCardState = "klaar" | "wacht" | "alles_afwijking";

interface LeveringConfirmCardProps {
  state: ConfirmCardState;
  totalLines: number;
  akkoord: number;
  afwijking: number;
  manualRequired: number;
  helperText: string | null;
  isPending: boolean;
  isDisabled: boolean;
  onConfirm: () => void;
  onJumpToFirstOpen?: () => void;
}

export function LeveringConfirmCard({
  state,
  akkoord,
  afwijking,
  manualRequired,
  helperText,
  isPending,
  isDisabled,
  onConfirm,
  onJumpToFirstOpen,
}: LeveringConfirmCardProps) {
  const config = {
    klaar: {
      Icon: Check,
      iconClass: "text-success",
      borderClass: "border-success/30 bg-success/5",
      title: "Klaar om te bevestigen",
      subtitle:
        afwijking > 0
          ? `${akkoord} akkoord · ${afwijking} afwijking`
          : `${akkoord} akkoord`,
    },
    wacht: {
      Icon: AlertCircle,
      iconClass: "text-warning",
      borderClass: "border-warning/40 bg-warning/5",
      title: `Nog ${manualRequired} ${manualRequired === 1 ? "regel vereist" : "regels vereisen"} invoer`,
      subtitle: "Vul de openstaande factoren aan om te bevestigen",
    },
    alles_afwijking: {
      Icon: AlertTriangle,
      iconClass: "text-warning",
      borderClass: "border-warning/40 bg-warning/5",
      title: "Levering volledig op afwijking",
      subtitle: "Bevestiging boekt geen voorraad",
    },
  }[state];

  const Icon = config.Icon;

  return (
    <section
      aria-live="polite"
      className={cn("rounded-2xl border p-6 mt-2", config.borderClass)}
    >
      <div className="flex items-start gap-3 mb-4">
        <Icon
          className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconClass)}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-h3 text-foreground">{config.title}</h3>
          <p className="text-small text-muted-foreground mt-1">
            {config.subtitle}
          </p>
          {state === "wacht" && onJumpToFirstOpen && (
            <button
              type="button"
              onClick={onJumpToFirstOpen}
              className="inline-flex items-center gap-1 mt-2 text-small text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Spring naar eerste open regel
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 pt-4 flex flex-col items-stretch sm:items-end gap-2">
        <NestoButton
          onClick={onConfirm}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          variant={state === "alles_afwijking" ? "danger" : "primary"}
          className="min-h-[60px] px-8 text-base w-full sm:w-auto sm:min-w-[280px]"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-5 w-5 mr-2" aria-hidden="true" />
          )}
          {isPending ? "Bevestigen…" : "Bevestig levering"}
        </NestoButton>
        {helperText && (
          <span className="text-xs text-muted-foreground sm:text-right">
            {helperText}
          </span>
        )}
      </div>
    </section>
  );
}
