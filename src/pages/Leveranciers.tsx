import { useState } from "react";
import { PageHeader, NestoButton, NestoBadge, DataTable, NestoInput } from "@/components/polar";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { LeverancierDetailPanel } from "@/components/inkoop/LeverancierDetailPanel";
import { Plus, Truck, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { NestoSelect } from "@/components/polar";
import type { DataTableColumn } from "@/components/polar";

const filterOptions = [
  { value: "all", label: "Alle" },
  { value: "actief", label: "Actief" },
  { value: "inactief", label: "Inactief" },
];

export default function Leveranciers() {
  const { data: leveranciers, isLoading } = useLeveranciers();
  const mutations = useVoorraadInkoopMutations();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [panelMode, setPanelMode] = useState<"create" | "detail" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = (leveranciers ?? []).filter((l) => {
    if (statusFilter === "actief" && !l.is_actief) return false;
    if (statusFilter === "inactief" && l.is_actief) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.naam.toLowerCase().includes(q) ||
        l.contactpersoon?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns: DataTableColumn<any>[] = [
    { key: "naam", header: "Naam", render: (l) => <span className="font-medium">{l.naam}</span> },
    {
      key: "type",
      header: "Type",
      render: (l) =>
        l.type ? <NestoBadge variant="default" size="sm">{l.type}</NestoBadge> : "-",
    },
    { key: "contactpersoon", header: "Contact", render: (l) => l.contactpersoon ?? "-" },
    { key: "email", header: "Email", render: (l) => l.email ?? "-" },
    {
      key: "artikelen",
      header: "Artikelen",
      className: "tabular-nums",
      render: (l) => l.artikel_count,
    },
    {
      key: "actief",
      header: "Actief",
      render: (l) => (
        <Switch
          checked={l.is_actief}
          onCheckedChange={(checked) => mutations.updateLeverancier.mutate({ id: l.id, is_actief: checked })}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
  ];

  const handleRowClick = (l: any) => {
    setSelectedId(l.id);
    setPanelMode("detail");
  };

  const handleCreateClick = () => {
    setSelectedId(null);
    setPanelMode("create");
  };

  const handlePanelClose = () => {
    setPanelMode(null);
    setSelectedId(null);
  };

  const handleCreated = (id: string) => {
    setSelectedId(id);
    setPanelMode("detail");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leveranciers"
        subtitle="Beheer leveranciers en hun artikelen."
        actions={
          <NestoButton leftIcon={<Plus className="h-4 w-4" />} onClick={handleCreateClick}>
            Nieuwe leverancier
          </NestoButton>
        }
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <NestoInput
            placeholder="Zoek leverancier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <NestoSelect
          options={filterOptions}
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Status"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(l) => l.id}
        onRowClick={handleRowClick}
        emptyMessage="Nog geen leveranciers"
        emptyIcon={Truck}
      />

      <LeverancierDetailPanel
        mode={panelMode}
        leverancierId={selectedId}
        onClose={handlePanelClose}
        onCreated={handleCreated}
      />
    </div>
  );
}
