/**
 * DuplicateIngredientChoiceDialog — R4b-3
 *
 * Verschijnt wanneer een chef een ingrediënt probeert aan te maken met een naam
 * die al bestaat (case-insensitive match). Biedt 3 paden:
 *
 *   1. KOPPEL ALS EXTRA LEVERANCIER → bestaande ingredient_id wordt hergebruikt,
 *      nieuwe leveranciers_artikelen rij wordt INSERT'ed naast de bestaande.
 *      Beide blijven is_actief=true. Trigger recalculeert kostprijs als MIN().
 *
 *   2. MAAK APART ALS VARIANT → naam krijgt suffix op basis van verpakking
 *      (auto-suggestie, editable). Nieuwe ingredient record met unieke naam.
 *
 *   3. ANNULEER → geen actie.
 *
 * Stateless presentational component: caller bepaalt wat er gebeurt.
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { NestoButton, NestoInput, NestoBadge } from "@/components/polar";
import { Package, Sparkles, Link2 } from "lucide-react";
import { naamMetSuffix } from "@/lib/variantSuffix";
import { fmtEuroPrecise } from "@/lib/format";
import type { DuplicateIngredient } from "@/hooks/useDuplicateIngredientCheck";

export interface VariantContext {
  verpakkingHoeveelheid?: number | null;
  verpakkingEenheid?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Het bestaande ingrediënt dat dezelfde naam heeft */
  duplicate: DuplicateIngredient | null;
  /** De originele naam die de chef intypte */
  origineleNaam: string;
  /** Verpakkings-info voor auto-suffix bij variant */
  variantContext?: VariantContext;
  /** Naam van de leverancier die gekoppeld zou worden (alleen voor display) */
  leverancierNaam?: string | null;
  /** Callback wanneer chef kiest voor "koppel als extra leverancier" */
  onKoppelExtra: (bestaandIngredientId: string) => void;
  /** Callback wanneer chef kiest voor "maak variant" met aangepaste naam */
  onMaakVariant: (nieuweNaam: string) => void;
  /** Pending-state van de bovenliggende mutation (voor button-spinner) */
  isSubmitting?: boolean;
}

export function DuplicateIngredientChoiceDialog({
  open,
  onOpenChange,
  duplicate,
  origineleNaam,
  variantContext,
  leverancierNaam,
  onKoppelExtra,
  onMaakVariant,
  isSubmitting,
}: Props) {
  const suggestieNaam = naamMetSuffix(origineleNaam, {
    verpakkingHoeveelheid: variantContext?.verpakkingHoeveelheid,
    verpakkingEenheid: variantContext?.verpakkingEenheid,
  });

  const [variantNaam, setVariantNaam] = useState(suggestieNaam);

  // Reset naam wanneer dialog opnieuw opent met andere context
  useEffect(() => {
    if (open) setVariantNaam(suggestieNaam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, duplicate?.id, origineleNaam]);

  if (!duplicate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">Ingrediënt bestaat al</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Er bestaat al een ingrediënt met de naam &ldquo;{origineleNaam}&rdquo;.
            Wat wil je doen?
          </p>
        </DialogHeader>

        {/* Bestaand ingrediënt — info-card */}
        <div className="rounded-xl border border-border/40 bg-muted/30 p-3 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {duplicate.naam}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <NestoBadge variant="default" size="sm">
                {duplicate.categorie}
              </NestoBadge>
              <span className="text-xs text-muted-foreground">
                {fmtEuroPrecise(duplicate.kostprijs)} / {duplicate.eenheid}
              </span>
            </div>
          </div>
        </div>

        {/* Optie 1 — koppel extra leverancier */}
        <div className="space-y-2.5 rounded-xl border border-border/40 p-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">
              Koppel als extra leverancier
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {leverancierNaam ? (
              <>
                <span className="font-medium text-foreground">{leverancierNaam}</span>{" "}
                wordt toegevoegd als extra leverancier voor dit ingrediënt. Bestaande
                leveranciers blijven actief; de kostprijs wordt automatisch de
                laagste van alle actieve leveranciers.
              </>
            ) : (
              <>
                De nieuwe leverancier wordt naast bestaande gekoppeld; kostprijs
                wordt automatisch de laagste actieve prijs.
              </>
            )}
          </p>
          <NestoButton
            variant="primary"
            size="sm"
            className="w-full"
            isLoading={isSubmitting}
            onClick={() => onKoppelExtra(duplicate.id)}
          >
            Koppel als extra leverancier
          </NestoButton>
        </div>

        {/* Optie 2 — variant aanmaken */}
        <div className="space-y-2.5 rounded-xl border border-border/40 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">
              Maak apart als variant
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Een nieuw, los ingrediënt aanmaken (bijv. andere verpakking of variant).
            Pas de naam aan om hem uniek te maken:
          </p>
          <NestoInput
            value={variantNaam}
            onChange={(e) => setVariantNaam(e.target.value)}
            placeholder="Naam variant"
            className="text-sm"
          />
          <NestoButton
            variant="outline"
            size="sm"
            className="w-full"
            disabled={
              variantNaam.trim().length === 0 ||
              variantNaam.trim().toLowerCase() === duplicate.naam.toLowerCase()
            }
            isLoading={isSubmitting}
            onClick={() => onMaakVariant(variantNaam.trim())}
          >
            Maak variant aan
          </NestoButton>
        </div>

        <DialogFooter className="pt-1">
          <NestoButton
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuleren
          </NestoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
