import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package } from "lucide-react";
import {
  PageHeader,
  SearchBar,
  NestoSelect,
  NestoBadge,
  DataTable,
  EmptyState,
  TableSkeleton,
  type DataTableColumn,
} from "@/components/polar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useIngredienten,
  filterIngredienten,
  getVoorraadStatus,
  type IngredientRow,
  type IngredientenFilters,
} from "@/hooks/useIngredienten";


// ============================================================================
// Constants
// ============================================================================

const CATEGORIE_OPTIONS = [
  { value: "", label: "Alle categorieën" },
  { value: "groenten", label: "Groenten" },
  { value: "vlees", label: "Vlees" },
  { value: "vis", label: "Vis" },
  { value: "zuivel", label: "Zuivel" },
  { value: "kruiden", label: "Kruiden" },
  { value: "olie", label: "Olie" },
  { value: "droog", label: "Droog" },
  { value: "overig", label: "Overig" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Alle statussen" },
  { value: "laag", label: "Laag" },
  { value: "op-voorraad", label: "Op voorraad" },
  { value: "overschot", label: "Overschot" },
];

const STATUS_CONFIG: Record<string, { variant: "error" | "success" | "primary"; label: string }> = {
  laag: { variant: "error", label: "Laag" },
  "op-voorraad": { variant: "success", label: "Op voorraad" },
  overschot: { variant: "primary", label: "Overschot" },
};

const BRON_BADGE: Record<string, { variant: "primary" | "default" | "warning" | "success"; label: string }> = {
  api: { variant: "primary", label: "API" },
  handmatig: { variant: "default", label: "Handmatig" },
  email: { variant: "warning", label: "Email" },
  upload: { variant: "success", label: "Upload" },
};

// ============================================================================
// Component
// ============================================================================

export default function Ingredienten() {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState<IngredientenFilters>({
    search: "",
    categorie: "",
    voorraadStatus: "",
    leverancierId: "",
    showArchived: false,
  });

  const { data, isLoading } = useIngredienten(filters);
  const { data: leveranciers = [] } = useLeveranciers();
  const filtered = React.useMemo(() => filterIngredienten(data, filters), [data, filters]);

  const leverancierOptions = React.useMemo(
    () => [
      { value: "", label: "Alle leveranciers" },
      { value: "none", label: "Geen leverancier" },
      ...leveranciers.map((l: any) => ({ value: l.id, label: l.naam })),
    ],
    [leveranciers]
  );

  const resetFilters = () =>
    setFilters({
      search: "",
      categorie: "",
      voorraadStatus: "",
      leverancierId: "",
      showArchived: false,
    });

  // Table columns
  const columns: DataTableColumn<IngredientRow>[] = React.useMemo(
    () => [
      {
        key: "naam",
        header: "Naam",
        render: (item) => {
          const actieveLevs = getActieveLeveranciers(item);
          const showGeenLevBadge =
            actieveLevs.length === 0 &&
            (item.kostprijs_bron || "").toLowerCase() === "handmatig";
          return (
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{item.naam}</p>
                {showGeenLevBadge && (
                  <NestoBadge variant="warning" size="sm">Geen leverancier</NestoBadge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{item.categorie}</p>
            </div>
          );
        },
      },
      {
        key: "eenheid",
        header: "Eenheid",
        render: (item) => <span className="text-muted-foreground">{item.eenheid}</span>,
      },
      {
        key: "kostprijs",
        header: "Kostprijs",
        render: (item) => {
          const bron = BRON_BADGE[(item.kostprijs_bron || "").toLowerCase()];
          return (
            <div className="flex items-center gap-1.5">
              <span className="tabular-nums font-medium text-foreground">
                {item.kostprijs != null ? `€${item.kostprijs.toFixed(2)}` : "—"}
              </span>
              {bron && <NestoBadge variant={bron.variant} size="sm">{bron.label}</NestoBadge>}
            </div>
          );
        },
      },
      {
        key: "leveranciers",
        header: "Leveranciers",
        render: (item) => {
          const actieveLevs = getActieveLeveranciers(item);
          if (actieveLevs.length === 0) {
            return <span className="text-sm text-muted-foreground">— Geen leverancier</span>;
          }
          if (actieveLevs.length === 1) {
            return <span className="text-sm text-foreground">{actieveLevs[0].naam}</span>;
          }
          const [first, ...rest] = actieveLevs;
          return (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-foreground cursor-help">
                    {first.naam}{" "}
                    <span className="text-muted-foreground">+{rest.length}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-0.5">
                    {rest.map((l) => (
                      <span key={l.id} className="text-xs">{l.naam}</span>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        key: "voorraad",
        header: "Voorraad",
        render: (item) => {
          const status = getVoorraadStatus(item.voorraad, item.min_voorraad);
          const cfg = STATUS_CONFIG[status];
          return (
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-foreground">
                {item.voorraad} {item.eenheid}
              </span>
              <NestoBadge variant={cfg.variant} size="sm">{cfg.label}</NestoBadge>
            </div>
          );
        },
      },
      {
        key: "allergenen",
        header: "Allergenen",
        render: (item) => {
          const allStatuses = item.ingredient_allergenen.map((ia) => ia.status);
          const allOnbekend = allStatuses.length > 0 && allStatuses.every((s) => s === "onbekend");
          const allGeen = allStatuses.length > 0 && allStatuses.every((s) => s === "geen");

          if (allOnbekend) {
            return <NestoBadge variant="warning" size="sm">Onbekend</NestoBadge>;
          }
          if (allGeen || allStatuses.length === 0) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          const visible = item.ingredient_allergenen.filter(
            (ia) => ia.status === "bevat" || ia.status === "kan_bevatten"
          );
          if (visible.length === 0) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="flex gap-1 flex-wrap">
              {visible.map((ia) => (
                <NestoBadge
                  key={ia.id}
                  variant={ia.status === "bevat" ? "error" : "warning"}
                  size="sm"
                >
                  {ia.allergenen.naam_nl}
                </NestoBadge>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingrediënten"
        subtitle={`${filtered.length} ingrediënt${filtered.length !== 1 ? "en" : ""}`}
        actions={[
          {
            label: "Nieuw ingrediënt",
            onClick: () => navigate("/voorraad/nieuw"),
            icon: Plus,
          },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <SearchBar
            value={filters.search}
            onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            placeholder="Zoek ingrediënt..."
            size="sm"
          />
        </div>
        <div className="w-[180px]">
          <NestoSelect
            value={filters.categorie}
            onValueChange={(v) => setFilters((f) => ({ ...f, categorie: v }))}
            options={CATEGORIE_OPTIONS}
            size="sm"
            placeholder="Alle categorieën"
          />
        </div>
        <div className="w-[160px]">
          <NestoSelect
            value={filters.voorraadStatus}
            onValueChange={(v) => setFilters((f) => ({ ...f, voorraadStatus: v }))}
            options={STATUS_OPTIONS}
            size="sm"
            placeholder="Alle statussen"
          />
        </div>
        <div className="w-[200px]">
          <NestoSelect
            value={filters.leverancierId}
            onValueChange={(v) => setFilters((f) => ({ ...f, leverancierId: v }))}
            options={leverancierOptions}
            size="sm"
            placeholder="Alle leveranciers"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={filters.showArchived}
            onCheckedChange={(v) => setFilters((f) => ({ ...f, showArchived: v }))}
          />
          <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
            Gearchiveerd
          </Label>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-12">
          <EmptyState
            icon={Package}
            title={data?.length === 0 ? "Voeg je eerste ingrediënt toe" : "Geen resultaten gevonden"}
            description={data?.length === 0 ? "Begin met het toevoegen van ingrediënten aan je keuken." : "Probeer andere zoektermen of filters."}
            action={
              data?.length === 0
                ? { label: "Nieuw ingrediënt", onClick: () => navigate("/voorraad/nieuw") }
                : { label: "Filters wissen", onClick: resetFilters }
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(item: IngredientRow) => item.id}
          onRowClick={(item: IngredientRow) => navigate(`/voorraad/${item.id}`)}
        />
      )}

    </div>
  );
}
