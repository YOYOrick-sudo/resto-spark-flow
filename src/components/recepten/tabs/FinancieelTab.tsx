import * as React from "react";
import { ReceptDetail } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { NestoInput } from "@/components/polar";

interface FinancieelTabProps {
  recept: ReceptDetail;
}

export function FinancieelTab({ recept }: FinancieelTabProps) {
  const { updateRecept } = useReceptMutations();
  const kostprijsPerPortie =
    recept.porties > 0 ? recept.totale_kostprijs / recept.porties : 0;

  const [verkoopprijs, setVerkoopprijs] = React.useState(recept.verkoopprijs ?? 0);

  React.useEffect(() => {
    setVerkoopprijs(recept.verkoopprijs ?? 0);
  }, [recept.verkoopprijs]);

  const handleVerkoopprijsBlur = () => {
    if (verkoopprijs !== (recept.verkoopprijs ?? 0)) {
      updateRecept.mutate({ id: recept.id, verkoopprijs: verkoopprijs || null });
    }
  };

  const marge = verkoopprijs > 0 ? ((verkoopprijs - kostprijsPerPortie) / verkoopprijs) * 100 : 0;
  const foodCost = verkoopprijs > 0 ? (kostprijsPerPortie / verkoopprijs) * 100 : 0;
  const adviesVerkoopprijs = kostprijsPerPortie > 0 ? kostprijsPerPortie / 0.3 : 0;

  return (
    <div className="space-y-4">
      {/* Kostprijs per portie */}
      <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Kostprijs per portie</span>
          <span className="text-lg font-semibold text-primary">€{kostprijsPerPortie.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Ingrediënten: €{recept.totale_ingredientkostprijs.toFixed(2)}</span>
          <span>Arbeid: €{recept.arbeidskostprijs.toFixed(2)}</span>
          <span>Totaal: €{recept.totale_kostprijs.toFixed(2)}</span>
        </div>
      </div>

      {/* Gerecht-specifiek: verkoopprijs + marges */}
      {recept.type === "gerecht" && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-label text-muted-foreground">Verkoopprijs (€)</label>
            <NestoInput
              type="number"
              min={0}
              step={0.01}
              value={verkoopprijs}
              onChange={(e) => setVerkoopprijs(Number(e.target.value))}
              onBlur={handleVerkoopprijsBlur}
              placeholder="0.00"
            />
          </div>

          {verkoopprijs > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Marge %"
                value={`${marge.toFixed(1)}%`}
                color={marge >= 70 ? "text-success" : marge >= 50 ? "text-pending" : "text-destructive"}
              />
              <MetricCard
                label="Food cost %"
                value={`${foodCost.toFixed(1)}%`}
                color={foodCost <= 30 ? "text-success" : foodCost <= 35 ? "text-pending" : "text-destructive"}
              />
            </div>
          )}

          <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Adviesverkoopprijs (30% food cost)
              </span>
              <span className="text-lg font-semibold text-primary">
                €{adviesVerkoopprijs.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-card p-4 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
