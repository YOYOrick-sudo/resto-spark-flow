import { Link, useParams } from "react-router-dom";
import { PageHeader, EmptyState, NestoBadge } from "@/components/polar";
import { Layers, ArrowLeft } from "lucide-react";
import { useHalffabricaat } from "@/hooks/useHalffabricaten";
import { useVoorraadBewegingen } from "@/hooks/useIngredient";
import { getVoorraadStatus } from "@/hooks/useIngredienten";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const TYPE_BADGE: Record<string, { variant: "success" | "error" | "primary" | "warning" | "default"; label: string }> = {
  IN: { variant: "success", label: "IN" },
  OUT: { variant: "error", label: "UIT" },
  CORRECTIE: { variant: "primary", label: "CORRECTIE" },
  WASTE: { variant: "warning", label: "WASTE" },
  TRANSFER: { variant: "default", label: "TRANSFER" },
};

export default function HalffabricatenDetail() {
  const { id } = useParams();
  const { data: hf, isLoading } = useHalffabricaat(id ?? null);
  const { data: bewegingen } = useVoorraadBewegingen(id ?? null);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Laden…</p>;
  }

  if (!hf) {
    return (
      <EmptyState
        icon={Layers}
        title="Halffabricaat niet gevonden"
        description="Dit halffabricaat bestaat niet of is verwijderd."
      />
    );
  }

  const status = getVoorraadStatus(hf.voorraad, hf.min_voorraad);
  const statusConfig: Record<string, { variant: "error" | "success" | "primary"; label: string }> = {
    laag: { variant: "error", label: "Laag" },
    "op-voorraad": { variant: "success", label: "Op voorraad" },
    overschot: { variant: "primary", label: "Overschot" },
  };
  const s = statusConfig[status];

  return (
    <div className="space-y-6">
      <Link
        to="/halffabricaten"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Halffabricaten
      </Link>

      <PageHeader title={hf.naam} subtitle={hf.recepten?.naam ? `Recept: ${hf.recepten.naam}` : undefined} />

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Voorraad</p>
          <p className="text-3xl font-semibold tabular-nums">
            {hf.voorraad}{" "}
            <span className="text-base font-normal text-muted-foreground">{hf.eenheid}</span>
          </p>
          <div className="mt-2">
            <NestoBadge variant={s.variant} size="sm">{s.label}</NestoBadge>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Minimum</p>
          <p className="text-3xl font-semibold tabular-nums text-muted-foreground">
            {hf.min_voorraad || "—"}{" "}
            {hf.min_voorraad ? <span className="text-base font-normal">{hf.eenheid}</span> : null}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Base eenheid</p>
          <p className="text-3xl font-semibold tabular-nums text-muted-foreground">{hf.base_unit}</p>
        </div>
      </div>

      <div>
        <h3 className="text-label text-muted-foreground uppercase tracking-wider mb-3">
          Laatste bewegingen
        </h3>
        {!bewegingen || bewegingen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen bewegingen</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {bewegingen.map((b) => {
              const cfg = TYPE_BADGE[b.type] || TYPE_BADGE.TRANSFER;
              return (
                <div key={b.id} className="flex items-center justify-between py-2.5 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <NestoBadge variant={cfg.variant} size="sm">{cfg.label}</NestoBadge>
                    <div className="min-w-0">
                      <span className={`text-sm font-medium tabular-nums ${b.hoeveelheid >= 0 ? "text-success" : "text-destructive"}`}>
                        {b.hoeveelheid >= 0 ? "+" : ""}{b.hoeveelheid} {hf.eenheid}
                      </span>
                      {b.opmerking && (
                        <span className="text-xs text-muted-foreground ml-2">{b.opmerking}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.created_at), "d MMM HH:mm", { locale: nl })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
