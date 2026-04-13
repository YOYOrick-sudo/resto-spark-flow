import { useState } from "react";
import { DataTable, NestoBadge, NestoButton, NestoSelect } from "@/components/polar";
import { useBestellingen, BestellingFilters } from "@/hooks/useBestellingen";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { BestellingDetailPanel } from "./BestellingDetailPanel";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";
import type { DataTableColumn } from "@/components/polar";

const statusVariant: Record<string, "default" | "primary" | "success" | "error"> = {
  concept: "default",
  verzonden: "primary",
  ontvangen: "success",
  geannuleerd: "error",
};

export function OrderhistorieTab() {
  const [filters, setFilters] = useState<BestellingFilters>({});
  const { data: bestellingen, isLoading } = useBestellingen(filters);
  const { data: leveranciers } = useLeveranciers();
  const mutations = useVoorraadInkoopMutations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: DataTableColumn<any>[] = [
    { key: "bestelnummer", header: "Bestelnummer", render: (b) => b.bestelnummer ?? "-" },
    { key: "leverancier", header: "Leverancier", render: (b) => b.leverancier_naam },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <NestoBadge variant={statusVariant[b.status] ?? "default"} size="sm">
          {b.status}
        </NestoBadge>
      ),
    },
    { key: "besteldatum", header: "Besteldatum", render: (b) => b.besteldatum ?? "-" },
    { key: "ontvangstdatum", header: "Ontvangst", render: (b) => b.ontvangstdatum ?? "-" },
    {
      key: "totaal",
      header: "Bedrag",
      className: "text-right tabular-nums",
      render: (b) => b.totaal_bedrag != null ? `€${b.totaal_bedrag.toFixed(2)}` : "-",
    },
    {
      key: "actions",
      header: "",
      render: (b) =>
        b.status === "ontvangen" || b.status === "geannuleerd" ? (
          <NestoButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              mutations.herbestelling.mutate(b.id);
            }}
            isLoading={mutations.herbestelling.isPending}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Herbestelling
          </NestoButton>
        ) : null,
    },
  ];

  const leverancierOptions = [
    { value: "", label: "Alle leveranciers" },
    ...(leveranciers ?? []).map((l) => ({ value: l.id, label: l.naam })),
  ];

  const statusOptions = [
    { value: "", label: "Alle statussen" },
    { value: "concept", label: "Concept" },
    { value: "verzonden", label: "Verzonden" },
    { value: "ontvangen", label: "Ontvangen" },
    { value: "geannuleerd", label: "Geannuleerd" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <NestoSelect
          options={leverancierOptions}
          value={filters.leverancierId ?? ""}
          onChange={(v) => setFilters((f) => ({ ...f, leverancierId: v || undefined }))}
          placeholder="Leverancier"
          className="w-48"
        />
        <NestoSelect
          options={statusOptions}
          value={filters.status ?? ""}
          onChange={(v) => setFilters((f) => ({ ...f, status: v || undefined }))}
          placeholder="Status"
          className="w-40"
        />
        <Input
          type="date"
          className="w-40"
          value={filters.dateFrom ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
          placeholder="Vanaf"
        />
        <Input
          type="date"
          className="w-40"
          value={filters.dateTo ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
          placeholder="Tot"
        />
      </div>

      <DataTable
        columns={columns}
        data={bestellingen ?? []}
        keyExtractor={(b) => b.id}
        onRowClick={(b) => setSelectedId(b.id)}
        emptyMessage="Geen bestellingen gevonden"
      />

      <BestellingDetailPanel bestellingId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
