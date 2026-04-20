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
import { berekenPortieGrootte, getPrimaireMethode } from "@/utils/portieGrootte";
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
      key: "porties",
      header: "Porties",
      render: (r) => <span className="text-muted-foreground">{r.porties}</span>,
    },
    {
      key: "perPortie",
      header: "Per portie",
      render: (r) => {
        const methode = getPrimaireMethode(r.halffabricaat_methodes ?? []);
        const portie = berekenPortieGrootte(methode?.output_hoeveelheid, methode?.output_eenheid, r.porties);
        return <span className="text-muted-foreground">{portie ? portie.display : "—"}</span>;
      },
    },
    {
      key: "kostprijs",
      header: "Kostprijs/portie",
      render: (r) => {
        const kpp = r.porties > 0 ? r.totale_kostprijs / r.porties : 0;
        return <span className="font-medium text-foreground">€{kpp.toFixed(2)}</span>;
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
      <PageHeader
        title="Halffabricaten"
        subtitle="Je sauzen, bouillons, marinades en andere bereidingen."
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

      <ModuleSubNav items={KEUKEN_SUBNAV} />

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
