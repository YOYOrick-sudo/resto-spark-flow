import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AllergeenPills, type AllergeenPillData } from "@/components/polar/AllergeenPills";

export function ReceptStapBevestigen() {
  const { formData } = useStepWizard();
  const basis = formData.basis || {};
  const ingredients = formData.ingredienten?.items ?? [];
  const methodes = formData.methodes?.items ?? [];
  const hasBereiding = !!formData.bereiding?.html && formData.bereiding.html !== "<p></p>";

  const ingredientIds = ingredients.map((i: any) => i.id);

  // Fetch allergenen for selected ingredients
  const { data: allergenenData } = useQuery({
    queryKey: ["wizard-allergenen", ingredientIds],
    queryFn: async () => {
      if (ingredientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ingredient_allergenen")
        .select("*, allergenen(id, code, naam_nl, sort_order)")
        .in("ingredient_id", ingredientIds);
      if (error) throw error;
      return data;
    },
    enabled: ingredientIds.length > 0,
  });

  // Compute unique allergen pills
  const allergeenPills: AllergeenPillData[] = React.useMemo(() => {
    if (!allergenenData) return [];
    const map = new Map<string, AllergeenPillData>();
    for (const row of allergenenData) {
      if (row.status === "geen") continue;
      const existing = map.get(row.allergeen_id);
      // "bevat" takes priority over "kan_bevatten"
      if (!existing || (row.status === "bevat" && existing.status !== "bevat")) {
        map.set(row.allergeen_id, {
          allergeen_id: row.allergeen_id,
          code: (row.allergenen as any)?.code ?? "?",
          naam_nl: (row.allergenen as any)?.naam_nl,
          status: row.status as "bevat" | "kan_bevatten",
        });
      }
    }
    return Array.from(map.values());
  }, [allergenenData]);

  // Calculate cost
  const totaal = ingredients.reduce((sum: number, i: any) => {
    if (i.kostprijs == null) return sum;
    const effectief = i.kostprijs / (i.yield_percentage / 100);
    return sum + i.hoeveelheid * effectief;
  }, 0);
  const perPortie = (basis.porties ?? 1) > 0 ? totaal / (basis.porties ?? 1) : 0;

  return (
    <div className="space-y-6">
      {/* Allergenen */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Allergenen</h3>
        {ingredients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Voeg ingrediënten toe om allergenen te berekenen
          </p>
        ) : (
          <>
            <AllergeenPills allergenen={allergeenPills} showEmpty emptyText="Geen allergenen gedetecteerd" maxVisible={14} />
            <p className="text-xs text-muted-foreground italic">
              Automatisch berekend uit de ingrediënten
            </p>
          </>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Samenvatting</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-muted-foreground">Naam</span>
          <span className="font-medium text-foreground">{basis.naam || "—"}</span>

          <span className="text-muted-foreground">Type</span>
          <span className="capitalize text-foreground">{basis.type || "—"}</span>

          <span className="text-muted-foreground">Categorie</span>
          <span className="capitalize text-foreground">{basis.categorie || "—"}</span>

          <span className="text-muted-foreground">Porties</span>
          <span className="text-foreground">{basis.porties || "—"}</span>

          {basis.actieve_bereidingstijd && (
            <>
              <span className="text-muted-foreground">Actieve bereiding</span>
              <span className="text-foreground">{basis.actieve_bereidingstijd} min</span>
            </>
          )}

          {basis.passieve_bereidingstijd && (
            <>
              <span className="text-muted-foreground">Passieve bereiding</span>
              <span className="text-foreground">{basis.passieve_bereidingstijd} min</span>
            </>
          )}

          <span className="text-muted-foreground">Ingrediënten</span>
          <span className="text-foreground">{ingredients.length}</span>

          <span className="text-muted-foreground">Ingrediëntkostprijs</span>
          <span className="font-medium text-foreground">€{totaal.toFixed(2)}</span>

          <span className="text-muted-foreground">Kostprijs per portie</span>
          <span className="font-medium text-primary">€{perPortie.toFixed(2)}</span>

          {basis.type === "halffabricaat" && (
            <>
              <span className="text-muted-foreground">Methodes</span>
              <span className="text-foreground">{methodes.length}</span>
            </>
          )}

          <span className="text-muted-foreground">Bereiding</span>
          <span className="text-foreground">{hasBereiding ? "✓ Beschreven" : "—"}</span>
        </div>
      </div>
    </div>
  );
}
