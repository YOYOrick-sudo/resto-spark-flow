import { useState, useMemo } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  IngredientMatchBadge,
  type NewIngredientPrefill,
} from "@/components/inkoop/IngredientMatchBadge";
import { VerpakkingHint } from "@/components/inkoop/VerpakkingHint";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";
import type { ChipId } from "./RegelFilterChips";

const OVERIG_REGEX = /bezorg|emballage|retour|statiegeld|toeslag|brandstof|milieu|pallet/i;

export type SectieId = "perfect" | "naam" | "ai" | "geen" | "overig";

export function categoriseer(r: FactuurRegel): SectieId {
  if (OVERIG_REGEX.test(r.product_naam_herkend)) return "overig";
  if (r.match_status === "unmatched") return "geen";
  const c = r.match_confidence ?? 0;
  if (c >= 0.98) return "perfect"; // tier 1 + 2
  if (c >= 0.9) return "naam"; // tier 3 + 4
  if (c >= 0.6) return "ai"; // tier 5 fuzzy
  return "geen";
}

const SECTIE_META: Record<
  SectieId,
  { emoji: string; label: string; defaultOpen: boolean; tone: "success" | "info" | "danger" | "muted" }
> = {
  perfect: { emoji: "🟢", label: "Perfect match", defaultOpen: false, tone: "success" },
  naam: { emoji: "🟢", label: "Naam-match", defaultOpen: false, tone: "success" },
  ai: { emoji: "🔵", label: "AI-suggestie", defaultOpen: true, tone: "info" },
  geen: { emoji: "🔴", label: "Geen match", defaultOpen: true, tone: "danger" },
  overig: { emoji: "⏭", label: "Overig", defaultOpen: false, tone: "muted" },
};

const CHIP_TO_SECTIES: Record<ChipId, SectieId[]> = {
  all: ["perfect", "naam", "ai", "geen", "overig"],
  nieuw: ["geen"],
  onzeker: ["ai", "geen"],
  gematcht: ["perfect", "naam"],
  overig: ["overig"],
};

interface Props {
  regels: FactuurRegel[];
  filter: ChipId;
  isEditable: boolean;
  leverancierId: string | null;
  onOpenNewIngredient: (regelId: string, prefill: NewIngredientPrefill) => void;
  onDeleteRegel: (id: string) => void;
}

export function RegelSecties({
  regels,
  filter,
  isEditable,
  leverancierId,
  onOpenNewIngredient,
  onDeleteRegel,
}: Props) {
  const grouped = useMemo(() => {
    const map: Record<SectieId, FactuurRegel[]> = {
      perfect: [],
      naam: [],
      ai: [],
      geen: [],
      overig: [],
    };
    for (const r of regels) {
      map[categoriseer(r)].push(r);
    }
    return map;
  }, [regels]);

  const visibleSecties = CHIP_TO_SECTIES[filter];

  // Open-state per sectie. Default = SECTIE_META.defaultOpen, tenzij filter actief
  // is (dan altijd open zodat content zichtbaar is).
  const [openMap, setOpenMap] = useState<Record<SectieId, boolean>>(() => ({
    perfect: SECTIE_META.perfect.defaultOpen,
    naam: SECTIE_META.naam.defaultOpen,
    ai: SECTIE_META.ai.defaultOpen,
    geen: SECTIE_META.geen.defaultOpen,
    overig: SECTIE_META.overig.defaultOpen,
  }));

  return (
    <div className="space-y-3">
      {visibleSecties.map((id) => {
        const items = grouped[id];
        if (items.length === 0) return null;
        const meta = SECTIE_META[id];
        // Bij niet-"all" filter: forceer open
        const forcedOpen = filter !== "all";
        const isOpen = forcedOpen ? true : openMap[id];

        return (
          <Collapsible
            key={id}
            open={isOpen}
            onOpenChange={(o) =>
              !forcedOpen && setOpenMap((m) => ({ ...m, [id]: o }))
            }
          >
            <CollapsibleTrigger
              disabled={forcedOpen}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left disabled:cursor-default disabled:hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{meta.emoji}</span>
                <span className="text-sm font-medium">{meta.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({items.length})
                </span>
              </div>
              {!forcedOpen && (
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-2 space-y-2">
              {items.map((r) => {
                const conf = r.match_confidence ?? 0;
                const needsAttention =
                  r.match_status === "unmatched" ||
                  (r.match_status === "matched" && conf <= 0.85);
                return (
                  <div
                    key={r.id}
                    className={`rounded-xl border p-3 space-y-2 ${
                      needsAttention
                        ? "border-warning/40 bg-warning/5"
                        : "border-border/30 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {r.product_naam_herkend}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.hoeveelheid ?? "-"} {r.eenheid ?? ""} · €
                          {r.prijs_per_eenheid?.toFixed(2) ?? "-"}/eh · €
                          {r.totaal?.toFixed(2) ?? "-"}
                        </p>
                        <VerpakkingHint regel={r} />
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => onDeleteRegel(r.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          aria-label="Verwijder regel"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {isEditable && (
                      <IngredientMatchBadge
                        regel={r}
                        leverancierId={leverancierId}
                        onOpenNewIngredient={(regelId, prefill) =>
                          onOpenNewIngredient(regelId, prefill)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
