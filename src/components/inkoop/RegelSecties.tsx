import { useState, useMemo } from "react";
import { ChevronDown, Trash2, Sparkles } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NestoButton } from "@/components/polar/NestoButton";
import { IngredientMatchBadge } from "@/components/inkoop/IngredientMatchBadge";
import { VerpakkingHint } from "@/components/inkoop/VerpakkingHint";
import { isVerpakkingRegel } from "@/lib/factuur-categories";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";
import type { ChipId } from "./RegelFilterChips";

// Sprint A3: 'overig' bestaat niet meer als hoofdlijst-categorie.
// Alle verpakking/emballage/toeslag-regels worden door isVerpakkingRegel()
// uit de hoofdlijst gefilterd vóór categorisering en getoond via VerpakkingModal.
export type SectieId = "perfect" | "naam" | "ai" | "geen";

export function categoriseer(r: FactuurRegel): SectieId {
  // R4b-1: skipped regels die GEEN verpakking zijn → 'geen' (chef kan nog handelen)
  if (r.match_status === "skipped") return "geen";
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
};

const CHIP_TO_SECTIES: Record<ChipId, SectieId[]> = {
  all: ["perfect", "naam", "ai", "geen"],
  nieuw: ["geen"],
  onzeker: ["ai", "geen"],
  gematcht: ["perfect", "naam"],
  // Sprint A3: 'verpakking' filter rendert geen secties — chef gebruikt VerpakkingModal.
  verpakking: [],
};

interface Props {
  // Sprint B1: 'flat' mode rendert direct een platte lijst (tab IS de grouping).
  // 'sections' mode behoudt de oude collapsible-sectie indeling (legacy).
  regels?: FactuurRegel[];
  visibleRegels?: FactuurRegel[];
  mode?: "sections" | "flat";
  filter?: ChipId;
  isEditable: boolean;
  leverancierId: string | null;
  leverancierNaam?: string | null;
  onDeleteRegel: (id: string) => void;
  onOpenBulkCreate?: (regels: FactuurRegel[]) => void;
  /** Bulk-create knop bovenaan flat-mode tonen (alleen voor "Nieuw aanmaken" tab). */
  showBulkCreate?: boolean;
}

export function RegelSecties({
  regels,
  visibleRegels,
  mode = "sections",
  filter = "all",
  isEditable,
  leverancierId,
  leverancierNaam,
  onDeleteRegel,
  onOpenBulkCreate,
  showBulkCreate = false,
}: Props) {
  // ---------- FLAT MODE (Sprint B1) ----------
  if (mode === "flat") {
    const items = visibleRegels ?? [];
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-6">
          Geen regels in deze weergave.
        </p>
      );
    }
    const bulkKandidaten = showBulkCreate
      ? items.filter(
          (r) =>
            r.match_status !== "skipped" &&
            (r.ai_suggested_naam ?? r.ai_raw_naam ?? r.product_naam_herkend)
              ?.trim().length > 0
        )
      : [];
    return (
      <div className="space-y-2">
        {showBulkCreate && bulkKandidaten.length >= 3 && isEditable && onOpenBulkCreate && (
          <NestoButton
            variant="primary"
            size="sm"
            onClick={() => onOpenBulkCreate(bulkKandidaten)}
            className="w-full justify-center"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Maak {bulkKandidaten.length} nieuwe ingrediënten ineens
          </NestoButton>
        )}
        {items.map((r) => {
          const conf = r.match_confidence ?? 0;
          const isSkipped = r.match_status === "skipped";
          const needsAttention =
            !isSkipped &&
            (r.match_status === "unmatched" ||
              (r.match_status === "matched" && conf <= 0.85));
          return (
            <div
              key={r.id}
              className={`rounded-xl border p-3 space-y-2 ${
                isSkipped
                  ? "border-border/30 bg-muted/10 opacity-70"
                  : needsAttention
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
                  leverancierNaam={leverancierNaam}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------- SECTIONS MODE (legacy) ----------
  const sectionRegels = regels ?? [];
  const sectionFilter = filter;
  const grouped = useMemo(() => {
    const map: Record<SectieId, FactuurRegel[]> = {
      perfect: [],
      naam: [],
      ai: [],
      geen: [],
    };
    // Sprint A3: verpakking-regels worden uitgesloten van de hoofdlijst.
    for (const r of sectionRegels) {
      if (isVerpakkingRegel(r)) continue;
      map[categoriseer(r)].push(r);
    }
    return map;
  }, [sectionRegels]);

  const visibleSecties = CHIP_TO_SECTIES[sectionFilter];

  const [openMap, setOpenMap] = useState<Record<SectieId, boolean>>(() => ({
    perfect: SECTIE_META.perfect.defaultOpen,
    naam: SECTIE_META.naam.defaultOpen,
    ai: SECTIE_META.ai.defaultOpen,
    geen: SECTIE_META.geen.defaultOpen,
  }));

  return (
    <div className="space-y-3">
      {visibleSecties.map((id) => {
        const items = grouped[id];
        if (items.length === 0) return null;
        const meta = SECTIE_META[id];
        const forcedOpen = sectionFilter !== "all";
        const isOpen = forcedOpen ? true : openMap[id];

        // R4b-1: bulk-create kandidaten = unmatched met AI-naam
        const bulkKandidaten =
          id === "geen"
            ? items.filter(
                (r) =>
                  r.match_status !== "skipped" &&
                  (r.ai_suggested_naam ?? r.ai_raw_naam ?? r.product_naam_herkend)
                    ?.trim().length > 0
              )
            : [];
        const showBulkKnop =
          id === "geen" && isEditable && bulkKandidaten.length >= 3 && !!onOpenBulkCreate;

        return (
          <Collapsible
            key={id}
            open={isOpen}
            onOpenChange={(o) =>
              !forcedOpen && setOpenMap((m) => ({ ...m, [id]: o }))
            }
          >
            <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30">
              <CollapsibleTrigger
                disabled={forcedOpen}
                className="flex-1 flex items-center justify-between gap-2 text-left disabled:cursor-default group"
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
              {showBulkKnop && onOpenBulkCreate && (
                <NestoButton
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenBulkCreate(bulkKandidaten);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Maak {bulkKandidaten.length} nieuwe ingrediënten
                </NestoButton>
              )}
            </div>

            <CollapsibleContent className="pt-2 space-y-2">
              {items.map((r) => {
                const conf = r.match_confidence ?? 0;
                const isSkipped = r.match_status === "skipped";
                const needsAttention =
                  !isSkipped &&
                  (r.match_status === "unmatched" ||
                    (r.match_status === "matched" && conf <= 0.85));
                return (
                  <div
                    key={r.id}
                    className={`rounded-xl border p-3 space-y-2 ${
                      isSkipped
                        ? "border-border/30 bg-muted/10 opacity-70"
                        : needsAttention
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
                        leverancierNaam={leverancierNaam}
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
