import * as React from "react";
import { NestoBadge, NestoButton, NestoInput } from "@/components/polar";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import type { IngredientRow } from "@/hooks/useIngredienten";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Pencil } from "lucide-react";

const BRON_BADGE: Record<string, { variant: "primary" | "default" | "warning" | "success"; label: string }> = {
  api: { variant: "primary", label: "API" },
  handmatig: { variant: "default", label: "Handmatig" },
  email: { variant: "warning", label: "Email" },
  upload: { variant: "success", label: "Upload" },
};

interface KostprijsTabProps {
  ingredient: IngredientRow;
}

export function KostprijsTab({ ingredient }: KostprijsTabProps) {
  const { updateKostprijs } = useIngredientMutations();
  const [editing, setEditing] = React.useState(false);
  const [nieuwePrijs, setNieuwePrijs] = React.useState(ingredient.kostprijs?.toString() ?? "");

  React.useEffect(() => {
    setNieuwePrijs(ingredient.kostprijs?.toString() ?? "");
    setEditing(false);
  }, [ingredient]);

  const bronCfg = BRON_BADGE[(ingredient.kostprijs_bron || "").toLowerCase()] || BRON_BADGE.handmatig;

  const effectieveKostprijs =
    ingredient.kostprijs && ingredient.yield_percentage < 100
      ? ingredient.kostprijs / (ingredient.yield_percentage / 100)
      : null;

  const handleSave = () => {
    const prijs = parseFloat(nieuwePrijs);
    if (isNaN(prijs) || prijs < 0) return;
    updateKostprijs.mutate(
      { id: ingredient.id, kostprijs: prijs },
      { onSuccess: () => setEditing(false) }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label text-muted-foreground mb-1">Huidige kostprijs</p>
        <div className="flex items-end gap-3">
          <p className="text-3xl font-semibold tabular-nums text-foreground">
            €{ingredient.kostprijs != null ? ingredient.kostprijs.toFixed(2) : "—"}
          </p>
          <span className="text-sm text-muted-foreground mb-1">per {ingredient.eenheid}</span>
          <NestoBadge variant={bronCfg.variant} size="sm">{bronCfg.label}</NestoBadge>
        </div>
        {ingredient.kostprijs_laatst_bijgewerkt && (
          <p className="text-xs text-muted-foreground mt-1">
            Laatst bijgewerkt: {format(new Date(ingredient.kostprijs_laatst_bijgewerkt), "d MMM yyyy", { locale: nl })}
          </p>
        )}
      </div>

      {ingredient.kostprijs != null && (
        <div className="p-4 rounded-card bg-secondary/50 border border-border/50 space-y-1">
          <p className="text-label text-muted-foreground mb-2">BTW berekening</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prijs excl. BTW</span>
            <span className="tabular-nums font-medium">€{ingredient.kostprijs.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">BTW ({ingredient.btw_percentage ?? 9}%)</span>
            <span className="tabular-nums font-medium">€{(ingredient.kostprijs * (ingredient.btw_percentage ?? 9) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 border-t border-border/50">
            <span className="text-foreground font-medium">Prijs incl. BTW</span>
            <span className="tabular-nums font-semibold">€{(ingredient.kostprijs * (1 + (ingredient.btw_percentage ?? 9) / 100)).toFixed(2)}</span>
          </div>
        </div>
      )}

      {!editing ? (
        <NestoButton variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Prijs aanpassen
        </NestoButton>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-label text-muted-foreground">Nieuw bedrag (€)</label>
            <NestoInput
              type="number"
              min={0}
              step={0.01}
              value={nieuwePrijs}
              onChange={(e) => setNieuwePrijs(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <NestoButton size="sm" onClick={handleSave} isLoading={updateKostprijs.isPending}>
              Opslaan
            </NestoButton>
            <NestoButton variant="outline" size="sm" onClick={() => setEditing(false)}>
              Annuleren
            </NestoButton>
          </div>
        </div>
      )}

      {effectieveKostprijs != null && (
        <div className="p-4 rounded-card bg-accent/30 border border-border/50">
          <p className="text-label text-muted-foreground mb-1">Effectieve kostprijs (met yield)</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">
            €{effectieveKostprijs.toFixed(2)}{" "}
            <span className="text-sm font-normal text-muted-foreground">per bruikbare {ingredient.eenheid}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Berekening: €{ingredient.kostprijs!.toFixed(2)} / ({ingredient.yield_percentage}% yield)
          </p>
        </div>
      )}
    </div>
  );
}
