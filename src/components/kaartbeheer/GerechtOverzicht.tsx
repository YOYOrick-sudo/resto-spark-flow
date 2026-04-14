import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, SearchBar, NestoSelect, NestoBadge, Spinner, EmptyState, NestoButton } from "@/components/polar";
import { Switch } from "@/components/ui/switch";
import { useGerechten, filterGerechten, type GerechtenFilters } from "@/hooks/useGerechten";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useGerechtAllergenen } from "@/hooks/useGerechtAllergenen";
import { NieuwGerechtPanel } from "./NieuwGerechtPanel";
import { Plus, UtensilsCrossed } from "lucide-react";

const DEFAULT_CATS = ["Voorgerechten", "Hoofdgerechten", "Desserts", "Bijgerechten", "Dranken", "Overig"];

function AllergeenPills({ gerechtId }: { gerechtId: string }) {
  const { data: allergenen } = useGerechtAllergenen(gerechtId);
  const relevant = (allergenen ?? []).filter((a) => a.status === "bevat" || a.status === "kan_bevatten");
  if (relevant.length === 0) return null;

  const show = relevant.slice(0, 4);
  const rest = relevant.length - show.length;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {show.map((a) => (
        <NestoBadge key={a.allergeen_id} variant={a.status === "bevat" ? "error" : "warning"} size="sm">
          {a.code}
        </NestoBadge>
      ))}
      {rest > 0 && (
        <NestoBadge variant="default" size="sm">+{rest}</NestoBadge>
      )}
    </div>
  );
}

export function GerechtOverzicht() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<GerechtenFilters>({ search: "", categorie: "", showArchived: false });
  const { data: gerechten, isLoading } = useGerechten(filters);
  const { data: settings } = useKeukenSettings();
  const { toggleActief } = useGerechtMutations();
  const [nieuwOpen, setNieuwOpen] = useState(false);

  const filtered = filterGerechten(gerechten, filters);

  const cats = ((settings as any)?.gerecht_categorieen as string[] | undefined) ?? DEFAULT_CATS;
  const catOptions = [{ value: "", label: "Alle categorieën" }, ...cats.map((c) => ({ value: c, label: c }))];

  const handleCreated = (id: string) => {
    navigate(`/kaartbeheer/${id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerechten"
        subtitle="Beheer je menukaart en food cost."
        actions={
          <NestoButton leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNieuwOpen(true)}>
            Nieuw gerecht
          </NestoButton>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={filters.search}
            onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            placeholder="Zoek gerechten..."
          />
        </div>
        <div className="w-48">
          <NestoSelect
            value={filters.categorie}
            onValueChange={(v) => setFilters((f) => ({ ...f, categorie: v }))}
            options={catOptions}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer min-h-[44px]">
          <Switch
            checked={filters.showArchived}
            onCheckedChange={(v) => setFilters((f) => ({ ...f, showArchived: v }))}
          />
          Gearchiveerd
        </label>
      </div>

      {/* Lijst */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Geen gerechten gevonden"
          description={
            gerechten?.length === 0 ? "Voeg je eerste gerecht toe om te beginnen." : "Pas je filters aan."
          }
          action={
            gerechten?.length === 0 ? { label: "Nieuw gerecht", onClick: () => setNieuwOpen(true), icon: Plus } : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => {
            const margeVariant =
              g.marge_percentage != null
                ? g.marge_percentage > 65
                  ? "success"
                  : g.marge_percentage >= 55
                  ? "warning"
                  : "error"
                : "default";

            return (
              <div
                key={g.id}
                onClick={() => navigate(`/kaartbeheer/${g.id}`)}
                className="flex items-center gap-4 py-3 px-4 rounded-xl border border-border/30 bg-card hover:bg-muted/30 cursor-pointer transition-colors min-h-[44px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.naam}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <NestoBadge variant="default" size="sm">
                      {g.categorie}
                    </NestoBadge>
                    <AllergeenPills gerechtId={g.id} />
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm">{g.verkoopprijs != null ? `€${g.verkoopprijs.toFixed(2)}` : "—"}</p>
                  <p className="text-xs text-muted-foreground">kost €{g.kostprijs.toFixed(2)}</p>
                </div>

                {g.marge_percentage != null && (
                  <NestoBadge variant={margeVariant} size="sm" className="shrink-0">
                    {g.marge_percentage.toFixed(0)}%
                  </NestoBadge>
                )}

                <Switch
                  checked={g.is_actief}
                  onCheckedChange={(v) => {
                    toggleActief.mutate({ id: g.id, is_actief: v });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      )}

      <NieuwGerechtPanel open={nieuwOpen} onClose={() => setNieuwOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
