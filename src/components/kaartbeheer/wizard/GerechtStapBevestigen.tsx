import { useStepWizard } from "@/components/polar/StepWizard";
import { AllergeenPills } from "@/components/polar/AllergeenPills";
import { NestoBadge } from "@/components/polar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllergenen } from "@/hooks/useIngredienten";

export function GerechtStapBevestigen() {
  const { formData } = useStepWizard();
  const basis = formData.basis ?? {};
  const recepten = formData.recepten?.items ?? [];
  const prijs = formData.prijs ?? {};

  const vkp = prijs.verkoopprijs ? parseFloat(prijs.verkoopprijs) : 0;
  const kostprijs = recepten.reduce(
    (sum: number, r: any) => sum + r.hoeveelheid * r.kostprijs_per_portie,
    0
  );
  const marge = vkp > 0 ? ((vkp - kostprijs) / vkp) * 100 : null;

  // Fetch allergens from linked recipe ingredients
  const receptIds = recepten.map((r: any) => r.id);
  const { data: allergeenRef } = useAllergenen();

  const { data: allergenen } = useQuery({
    queryKey: ["wizard-allergenen", receptIds],
    queryFn: async () => {
      if (receptIds.length === 0 || !allergeenRef) return [];

      // Get ingredient IDs from recipes
      const { data: ri } = await supabase
        .from("recept_ingredienten")
        .select("ingredient_id")
        .in("recept_id", receptIds);

      const ingredientIds = [...new Set((ri ?? []).map((r: any) => r.ingredient_id).filter(Boolean))];
      if (ingredientIds.length === 0) {
        return allergeenRef.map((a: any) => ({
          allergeen_id: a.id,
          code: a.code,
          naam_nl: a.naam_nl,
          status: "geen" as const,
        }));
      }

      const { data: ia } = await supabase
        .from("ingredient_allergenen")
        .select("allergeen_id, status")
        .in("ingredient_id", ingredientIds);

      const statusMap = new Map<string, string>();
      for (const row of (ia ?? []) as any[]) {
        const current = statusMap.get(row.allergeen_id);
        if (row.status === "bevat") statusMap.set(row.allergeen_id, "bevat");
        else if (row.status === "kan_bevatten" && current !== "bevat") statusMap.set(row.allergeen_id, "kan_bevatten");
        else if (!current) statusMap.set(row.allergeen_id, row.status);
      }

      return allergeenRef.map((a: any) => ({
        allergeen_id: a.id,
        code: a.code,
        naam_nl: a.naam_nl,
        status: (statusMap.get(a.id) ?? "geen") as "bevat" | "kan_bevatten" | "geen" | "onbekend",
      }));
    },
    enabled: receptIds.length > 0 && !!allergeenRef,
  });

  const margeVariant = marge !== null ? (marge > 70 ? "success" : marge >= 60 ? "warning" : "error") : "default";

  return (
    <div className="space-y-6">
      {/* Allergens */}
      <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Allergenen
        </h3>
        {receptIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Koppel recepten om allergenen te berekenen.
          </p>
        ) : allergenen ? (
          <>
            <AllergeenPills allergenen={allergenen} maxVisible={14} showEmpty emptyText="Geen allergenen gevonden" />
            <p className="text-xs text-muted-foreground">
              Automatisch berekend uit de ingrediënten van je recepten.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Laden...</p>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Samenvatting
        </h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-muted-foreground">Naam</span>
          <span className="text-right font-medium">{basis.naam || "—"}</span>
          <span className="text-muted-foreground">Categorie</span>
          <span className="text-right">{basis.categorie || "—"}</span>
          <span className="text-muted-foreground">Recepten</span>
          <span className="text-right">{recepten.length}</span>
          <span className="text-muted-foreground">Verkoopprijs</span>
          <span className="text-right">{vkp > 0 ? `€${vkp.toFixed(2)}` : "—"}</span>
          <span className="text-muted-foreground">Kostprijs</span>
          <span className="text-right">{recepten.length > 0 ? `€${kostprijs.toFixed(2)}` : "—"}</span>
          <span className="text-muted-foreground">Marge</span>
          <span className="text-right">
            {marge !== null ? (
              <NestoBadge variant={margeVariant} size="sm">{marge.toFixed(1)}%</NestoBadge>
            ) : "—"}
          </span>
        </div>
      </div>

      {prijs.foto_url && (
        <div className="rounded-xl overflow-hidden border border-border/30">
          <img src={prijs.foto_url} alt="Gerecht foto" className="w-full h-40 object-cover" />
        </div>
      )}
    </div>
  );
}
