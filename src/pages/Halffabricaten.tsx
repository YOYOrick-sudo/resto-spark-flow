import { Link } from "react-router-dom";
import { PageHeader, EmptyState, NestoBadge } from "@/components/polar";
import { Layers } from "lucide-react";
import { useHalffabricaten } from "@/hooks/useHalffabricaten";
import { getVoorraadStatus } from "@/hooks/useIngredienten";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function Halffabricaten() {
  const { data: items, isLoading } = useHalffabricaten();

  const statusConfig: Record<string, { variant: "error" | "success" | "primary"; label: string }> = {
    laag: { variant: "error", label: "Laag" },
    "op-voorraad": { variant: "success", label: "Op voorraad" },
    overschot: { variant: "primary", label: "Overschot" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Halffabricaten"
        subtitle="Voorraad gelezen uit ingredienten-tabel (recept_id-join)."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nog geen halffabricaten"
          description="Maak een recept aan met type 'halffabricaat'."
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Naam</th>
                <th className="text-right px-4 py-2.5 font-medium">Voorraad</th>
                <th className="text-right px-4 py-2.5 font-medium">Min</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Laatst bijgewerkt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((h) => {
                const status = getVoorraadStatus(h.voorraad, h.min_voorraad);
                const s = statusConfig[status];
                return (
                  <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/halffabricaten/${h.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {h.naam}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {h.voorraad} <span className="text-muted-foreground font-normal">{h.eenheid}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {h.min_voorraad || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <NestoBadge variant={s.variant} size="sm">{s.label}</NestoBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(h.updated_at), { addSuffix: true, locale: nl })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
