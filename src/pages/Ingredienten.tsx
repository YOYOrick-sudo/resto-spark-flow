import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, Package, AlertCircle } from "lucide-react";
import {
  PageHeader,
  SearchBar,
  FilterSidebar,
  DataTable,
  StatusDot,
  NestoBadge,
  EmptyState,
  TableSkeleton,
  type DataTableColumn,
  type FilterDefinition,
} from "@/components/polar";

// ============================================================================
// Types
// ============================================================================

interface Ingredient {
  id: string;
  naam: string;
  categorie: string;
  voorraad: number;
  voorraadEenheid: string;
  minVoorraad: number;
  kostprijs: number;
  laatstAangevuld: string;
  allergenen: string[];
}

// ============================================================================
// Mock Data
// ============================================================================

const mockIngredienten: Ingredient[] = [
  {
    id: "1",
    naam: "Kipfilet",
    categorie: "Vlees & Vis",
    voorraad: 5,
    voorraadEenheid: "kg",
    minVoorraad: 2,
    kostprijs: 12.5,
    laatstAangevuld: "31 dec 2025",
    allergenen: [],
  },
  {
    id: "2",
    naam: "Basilicum",
    categorie: "Kruiden",
    voorraad: 150,
    voorraadEenheid: "g",
    minVoorraad: 200,
    kostprijs: 1.97,
    laatstAangevuld: "24 nov 2025",
    allergenen: [],
  },
  {
    id: "3",
    naam: "Tomaten",
    categorie: "Groenten",
    voorraad: 8,
    voorraadEenheid: "kg",
    minVoorraad: 5,
    kostprijs: 3.25,
    laatstAangevuld: "30 dec 2025",
    allergenen: [],
  },
  {
    id: "4",
    naam: "Parmezaanse kaas",
    categorie: "Zuivel",
    voorraad: 0.5,
    voorraadEenheid: "kg",
    minVoorraad: 1,
    kostprijs: 28.0,
    laatstAangevuld: "15 dec 2025",
    allergenen: ["Melk"],
  },
  {
    id: "5",
    naam: "Olijfolie Extra Vergine",
    categorie: "Oliën & Vetten",
    voorraad: 5,
    voorraadEenheid: "liter",
    minVoorraad: 3,
    kostprijs: 8.95,
    laatstAangevuld: "20 dec 2025",
    allergenen: [],
  },
  {
    id: "6",
    naam: "Spaghetti",
    categorie: "Droog & Pasta",
    voorraad: 10,
    voorraadEenheid: "kg",
    minVoorraad: 5,
    kostprijs: 2.15,
    laatstAangevuld: "28 dec 2025",
    allergenen: ["Gluten"],
  },
  {
    id: "7",
    naam: "Knoflook",
    categorie: "Groenten",
    voorraad: 0,
    voorraadEenheid: "stuks",
    minVoorraad: 20,
    kostprijs: 0.15,
    laatstAangevuld: "10 dec 2025",
    allergenen: [],
  },
  {
    id: "8",
    naam: "Zalm",
    categorie: "Vlees & Vis",
    voorraad: 3,
    voorraadEenheid: "kg",
    minVoorraad: 2,
    kostprijs: 24.0,
    laatstAangevuld: "29 dec 2025",
    allergenen: ["Vis"],
  },
];

// ============================================================================
// Filter Definitions
// ============================================================================

const filterDefinitions: FilterDefinition[] = [
  {
    id: "categorie",
    label: "Categorie",
    placeholder: "Alle categorieën",
    options: [
      { value: "all", label: "Alle categorieën" },
      { value: "groenten", label: "Groenten" },
      { value: "vlees-vis", label: "Vlees & Vis" },
      { value: "zuivel", label: "Zuivel" },
      { value: "kruiden", label: "Kruiden" },
      { value: "olien", label: "Oliën & Vetten" },
      { value: "droog", label: "Droog & Pasta" },
    ],
  },
  {
    id: "locatie",
    label: "Locatie",
    placeholder: "Alle locaties",
    options: [
      { value: "all", label: "Alle locaties" },
      { value: "koelcel", label: "Koelcel" },
      { value: "vriezer", label: "Vriezer" },
      { value: "droog", label: "Droge opslag" },
      { value: "keuken", label: "Keuken" },
    ],
  },
  {
    id: "voorraad-status",
    label: "Voorraad status",
    placeholder: "Alle statussen",
    options: [
      { value: "all", label: "Alle statussen" },
      { value: "op-voorraad", label: "Op voorraad" },
      { value: "bijna-op", label: "Bijna op" },
      { value: "op", label: "Op" },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

export default function Ingredienten() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchValue, setSearchValue] = React.useState("");
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = React.useState<string>("naam");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Simulate loading
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filter and search logic
  const filteredData = React.useMemo(() => {
    let result = [...mockIngredienten];

    // Search
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(
        (item) =>
          item.naam.toLowerCase().includes(search) ||
          item.categorie.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (filterValues.categorie && filterValues.categorie !== "all") {
      const categoryMap: Record<string, string> = {
        groenten: "Groenten",
        "vlees-vis": "Vlees & Vis",
        zuivel: "Zuivel",
        kruiden: "Kruiden",
        olien: "Oliën & Vetten",
        droog: "Droog & Pasta",
      };
      result = result.filter(
        (item) => item.categorie === categoryMap[filterValues.categorie]
      );
    }

    // Filter by stock status
    if (filterValues["voorraad-status"] && filterValues["voorraad-status"] !== "all") {
      result = result.filter((item) => {
        const ratio = item.voorraad / item.minVoorraad;
        switch (filterValues["voorraad-status"]) {
          case "op-voorraad":
            return ratio >= 1;
          case "bijna-op":
            return ratio > 0 && ratio < 1;
          case "op":
            return item.voorraad === 0;
          default:
            return true;
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortColumn as keyof Ingredient];
      const bVal = b[sortColumn as keyof Ingredient];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [searchValue, filterValues, sortColumn, sortDirection]);

  // Get status for stock level
  const getStockStatus = (item: Ingredient): "success" | "warning" | "error" => {
    if (item.voorraad === 0) return "error";
    if (item.voorraad < item.minVoorraad) return "warning";
    return "success";
  };

  // Table columns
  const columns: DataTableColumn<Ingredient>[] = [
    {
      key: "naam",
      header: "Naam",
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.naam}</p>
          <p className="text-xs text-muted-foreground">{item.categorie}</p>
        </div>
      ),
    },
    {
      key: "voorraad",
      header: "Voorraad",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <StatusDot status={getStockStatus(item)} />
          <span>
            {item.voorraad} {item.voorraadEenheid}
          </span>
        </div>
      ),
    },
    {
      key: "minVoorraad",
      header: "Minimum",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">
          {item.minVoorraad} {item.voorraadEenheid}
        </span>
      ),
    },
    {
      key: "kostprijs",
      header: "Kostprijs",
      sortable: true,
      render: (item) => (
        <span className="text-primary font-medium">
          €{item.kostprijs.toFixed(2)}
        </span>
      ),
    },
    {
      key: "laatstAangevuld",
      header: "Laatst aangevuld",
      sortable: true,
    },
    {
      key: "allergenen",
      header: "Allergenen",
      render: (item) =>
        item.allergenen.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {item.allergenen.map((allergen) => (
              <NestoBadge key={allergen} variant="warning" size="sm">
                {allergen}
              </NestoBadge>
            ))}
          </div>
        ) : null,
    },
  ];

  const handleFilterChange = (id: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setSearchValue("");
    setCurrentPage(1);
  };

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingrediënten"
        subtitle={`${filteredData.length} ingrediënten`}
        actions={[
          {
            label: "Importeren",
            onClick: () => console.log("Import"),
            variant: "outline",
            icon: Upload,
          },
          {
            label: "Nieuw ingrediënt",
            onClick: () => console.log("Add new"),
            icon: Plus,
          },
        ]}
      />

      {/* Search bar */}
      <SearchBar
        value={searchValue}
        onChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        placeholder="Zoek ingrediënt..."
      />

      {/* Content area with filters and table */}
      <div className="flex gap-6">
        {/* Filter sidebar */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <FilterSidebar
            title="FILTERS"
            filters={filterDefinitions}
            values={filterValues}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : filteredData.length === 0 && (searchValue || Object.keys(filterValues).length > 0) ? (
            <div className="rounded-2xl border border-border bg-card p-12">
              <EmptyState
                icon={AlertCircle}
                title="Geen resultaten gevonden"
                description="Probeer andere zoektermen of filters."
                action={{
                  label: "Filters wissen",
                  onClick: handleClearFilters,
                }}
              />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredData}
              keyExtractor={(item: Ingredient) => item.id}
              onRowClick={(item) => navigate(`/ingredienten/${item.id}`)}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage="Geen ingrediënten gevonden"
              emptyIcon={Package}
              pagination={{
                currentPage,
                pageSize,
                totalItems: filteredData.length,
                onPageChange: setCurrentPage,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
