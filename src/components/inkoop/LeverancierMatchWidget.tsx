import { Sparkles, Check, AlertCircle, Loader2, Plus } from "lucide-react";
import { NestoButton, NestoBadge } from "@/components/polar";
import { useFuzzyMatchLeverancier } from "@/hooks/useFuzzyMatchLeverancier";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { useNavigate } from "react-router-dom";

interface Props {
  factuurId: string;
  aiStatus: string | null;
  herkendNaam: string | null;
  huidigeLeverancierId: string | null;
  huidigeLeverancierNaam?: string | null;
  aiConfidence: number | null;
  rawResponse: any;
}

/**
 * Toont match-status van AI-herkende leverancier.
 * 4 states: AI bezig / AI gefaald / auto-gematcht / geen match (suggesties).
 */
export function LeverancierMatchWidget({
  factuurId,
  aiStatus,
  herkendNaam,
  huidigeLeverancierId,
  huidigeLeverancierNaam,
  aiConfidence,
  rawResponse,
}: Props) {
  const navigate = useNavigate();
  const { linkLeverancierAlias, updateFactuur } = useFactuurMutations();
  const { data: suggesties = [], isLoading: suggestiesLoading } = useFuzzyMatchLeverancier(
    !huidigeLeverancierId ? herkendNaam : null
  );

  // State 1: AI bezig
  if (aiStatus === "pending" || aiStatus === "processing") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> AI leest factuur...
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Leverancier en regels worden automatisch herkend.
          </p>
        </div>
      </div>
    );
  }

  // State 2: AI faalde
  if (aiStatus === "failed") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">AI kon factuur niet lezen</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vul leverancier en regels handmatig in.
          </p>
        </div>
      </div>
    );
  }

  // State 3: Auto-matched (factuur heeft al leverancier_id)
  if (huidigeLeverancierId && herkendNaam) {
    const isHighConfidence = (aiConfidence ?? 0) > 0.7;
    return (
      <div
        className={`rounded-xl border p-4 ${
          isHighConfidence
            ? "border-success/40 bg-success/5"
            : "border-warning/40 bg-warning/5"
        }`}
      >
        <div className="flex items-start gap-3">
          <Check
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              isHighConfidence ? "text-success" : "text-warning"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isHighConfidence ? "Auto-gematcht" : "Onzekere match"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI las "{herkendNaam}" → gekoppeld aan{" "}
              <span className="font-medium text-foreground">
                {huidigeLeverancierNaam ?? "leverancier"}
              </span>
              {aiConfidence != null && (
                <NestoBadge variant="default" size="sm" className="ml-2">
                  {Math.round(aiConfidence * 100)}%
                </NestoBadge>
              )}
            </p>
          </div>
          <NestoButton
            variant="ghost"
            size="sm"
            onClick={() =>
              updateFactuur.mutate({ id: factuurId, leverancier_id: null })
            }
          >
            Wijzig
          </NestoButton>
        </div>
      </div>
    );
  }

  // State 4: Geen match — toon suggesties + CTA's
  const aiLeverancierData =
    rawResponse?.leverancier?.naam ?? rawResponse?.leverancier_naam ?? herkendNaam ?? "";

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Geen leverancier gekoppeld</p>
          {aiLeverancierData && (
            <p className="text-xs text-muted-foreground mt-0.5">
              AI las: <strong>"{aiLeverancierData}"</strong> — geen exacte match in jouw lijst.
            </p>
          )}
        </div>
      </div>

      {suggestiesLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
      ) : suggesties.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Bedoelde je?
          </p>
          {suggesties.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                linkLeverancierAlias.mutate({
                  factuurId,
                  leverancierId: s.id,
                  aliasNaam: aiLeverancierData,
                })
              }
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-card hover:bg-muted/50 border border-border/30 min-h-[44px] transition-colors"
            >
              <span className="text-sm font-medium truncate">{s.naam}</span>
              <NestoBadge variant="default" size="sm" className="shrink-0 ml-2">
                {Math.round(s.similarity * 100)}% match
              </NestoBadge>
            </button>
          ))}
        </div>
      ) : null}

      <NestoButton
        variant="outline"
        size="sm"
        className="w-full min-h-[44px]"
        onClick={() =>
          navigate(
            `/voorraad?tab=leveranciers&prefill=${encodeURIComponent(
              JSON.stringify({ naam: aiLeverancierData })
            )}`
          )
        }
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Nieuwe leverancier aanmaken
      </NestoButton>
    </div>
  );
}
