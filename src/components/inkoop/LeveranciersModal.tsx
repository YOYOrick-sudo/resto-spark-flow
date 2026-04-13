import { useState } from "react";
import { NestoModal, NestoButton, NestoBadge, DataTable, ConfirmDialog } from "@/components/polar";
import { useLeveranciers } from "@/hooks/useLeveranciers";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { NieuwLeverancierModal } from "./NieuwLeverancierModal";
import { LeverancierDetailPanel } from "./LeverancierDetailPanel";
import { Plus, Truck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { DataTableColumn } from "@/components/polar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeveranciersModal({ open, onOpenChange }: Props) {
  const { data: leveranciers, isLoading } = useLeveranciers();
  const mutations = useVoorraadInkoopMutations();
  const [nieuwOpen, setNieuwOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const columns: DataTableColumn<any>[] = [
    { key: "naam", header: "Naam", render: (l) => <span className="font-medium">{l.naam}</span> },
    {
      key: "type",
      header: "Type",
      render: (l) =>
        l.type ? (
          <NestoBadge variant="default" size="sm">
            {l.type}
          </NestoBadge>
        ) : "-",
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
          onCheckedChange={(checked) => {
            mutations.updateLeverancier.mutate({ id: l.id, is_actief: checked });
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
  ];

  return (
    <>
      <NestoModal
        open={open}
        onOpenChange={onOpenChange}
        title="Leveranciers beheren"
        icon={<Truck className="h-5 w-5" />}
        size="xl"
        footer={
          <div className="flex justify-end">
            <NestoButton
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setNieuwOpen(true)}
              size="sm"
            >
              Nieuwe leverancier
            </NestoButton>
          </div>
        }
      >
        <DataTable
          columns={columns}
          data={leveranciers ?? []}
          keyExtractor={(l) => l.id}
          onRowClick={(l) => setDetailId(l.id)}
          emptyMessage="Nog geen leveranciers"
          emptyIcon={Truck}
        />
      </NestoModal>

      <NieuwLeverancierModal open={nieuwOpen} onOpenChange={setNieuwOpen} />

      <LeverancierDetailPanel
        leverancierId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
