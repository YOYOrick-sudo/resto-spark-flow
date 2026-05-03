import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  SearchBar,
  NestoSelect,
  NestoButton,
  NestoBadge,
  DataTable,
  Spinner,
  ModuleSubNav,
} from "@/components/polar";
import { KEUKEN_SUBNAV } from "@/lib/moduleSubNav";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus } from "lucide-react";
import { useRecepten, filterRecepten, ReceptRow, ReceptenFilters } from "@/hooks/useRecepten";
import { getPrimaireMethode } from "@/utils/portieGrootte";
import { berekenOutputMassa } from "@/utils/opbrengstBerekening";
import { fmtEuro, fmtEuroPrecise } from "@/lib/format";
import type { DataTableColumn } from "@/components/polar";

const CATEGORIE_FILTER_OPTIONS = [
  { value: "", label: "Alle categorieën" },
  { value: "sauzen", label: "Sauzen" },
  { value: "bijgerechten", label: "Bijgerechten" },
  { value: "hoofdgerechten", label: "Hoofdgerechten" },
  { value: "desserts", label: "Desserts" },
  { value: "bases", label: "Bases" },
  { value: "marinades", label: "Marinades" },
  { value: "overig", label: "Overig" },
];

export default function Recepten() {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState<ReceptenFilters>({
    search: "",
    categorie: "",
    showArchived: false,
  });

  const { data, isLoading } = useRecepten(filters);
  const filtered = filterRecepten(data, filters);

  const columns: DataTableColumn<ReceptRow>[] = [
    {
      key: "naam",
      header: "Naam",
      sortable: true,
      render: (r) => <span className="font-medium text-foreground">{r.naam}</span>,
    },
    {
      key: "categorie",
      header: "Categorie",
      render: (r) => (
        <span className="text-muted-foreground capitalize">{r.categorie}</span>
      ),
    },
    {
      key: "perBereiding",
      header: "Per bereiding",
      render: (r) => {
        const methodes = [...(r.halffabricaat_methodes ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        const m = getPrimaireMethode(methodes);
        if (!m || !m.output_hoeveelheid) return <span className="text-muted-foreground">—</span>;
        const isStuks = m.output_eenheid === "st" || m.output_eenheid === "stuks";
        const label =
          isStuks && m.output_gewicht_per_stuk_g
            ? `${m.output_hoeveelheid} st × ${m.output_gewicht_per_stuk_g}g`
            : `${m.output_hoeveelheid} ${m.output_eenheid}`;
        return <span className="text-muted-foreground tabular-nums">{label}</span>;
      },
    },
    {
      key: "kostprijsBereiding",
      header: "Kostprijs/bereiding",
      render: (r) => (
        <span className="font-medium text-foreground tabular-nums">
          {fmtEuro(r.totale_kostprijs)}
        </span>
      ),
    },
    {
      key: "perEenheid",
      header: "Per eenheid",
      render: (r) => {
        const methodes = [...(r.halffabricaat_methodes ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        const m = getPrimaireMethode(methodes);
        if (!m) return <span className="text-muted-foreground">—</span>;
        const isStuks = m.output_eenheid === "st" || m.output_eenheid === "stuks";
        if (isStuks) {
          if (!m.output_hoeveelheid) return <span className="text-muted-foreground">—</span>;
          const perStuk = r.totale_kostprijs / m.output_hoeveelheid;
          return (
            <span className="text-muted-foreground tabular-nums">
              {fmtEuroPrecise(perStuk)}/st
            </span>
          );
        }
        const massaG = berekenOutputMassa(m);
        if (!massaG || massaG <= 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-muted-foreground tabular-nums">
            {fmtEuroPrecise(r.totale_kostprijs / massaG)}/g
          </span>
        );
      },
    },
    {
      key: "allergenen",
      header: "Allergenen",
      render: (r) => {
        const actief = (r.recept_allergenen || []).filter(
          (a) => a.status === "bevat" || a.status === "kan_bevatten"
        );
        if (actief.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex gap-1 flex-wrap">
            {actief.slice(0, 4).map((a) => (
              <NestoBadge
                key={a.id}
                variant={a.status === "bevat" ? "error" : "warning"}
                size="sm"
              >
                {a.allergenen?.naam_nl ?? "?"}
              </NestoBadge>
            ))}
            {actief.length > 4 && (
              <NestoBadge variant="default" size="sm">
                +{actief.length - 4}
              </NestoBadge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <ModuleSubNav items={KEUKEN_SUBNAV} />

      <PageHeader
        title="Halffabricaten"
        help={{
          content: "Je sauzen, bouillons, marinades en andere bereidingen.",
        }}
        actions={
          <NestoButton
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate("/recepten/nieuw")}
            className="min-h-[48px]"
          >
            Nieuw halffabricaat
          </NestoButton>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchBar
          value={filters.search}
          onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
          placeholder="Zoek op naam..."
          className="w-full sm:w-64"
        />
        <NestoSelect
          value={filters.categorie}
          onValueChange={(v) => setFilters((f) => ({ ...f, categorie: v }))}
          options={CATEGORIE_FILTER_OPTIONS}
          size="sm"
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={filters.showArchived}
            onCheckedChange={(v) =>
              setFilters((f) => ({ ...f, showArchived: v }))
            }
          />
          <span className="text-xs text-muted-foreground">Gearchiveerd</span>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => navigate(`/recepten/${r.id}`)}
          emptyMessage="Nog geen halffabricaten toegevoegd"
          emptyIcon={BookOpen}
        />
      )}
    </div>
  );
}
