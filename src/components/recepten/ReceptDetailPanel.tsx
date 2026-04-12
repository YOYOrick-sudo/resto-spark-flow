import * as React from "react";
import { useRecept, ReceptDetail } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";
import { NestoPanel, NestoTabs, NestoTabContent, NestoBadge, NestoButton, NestoInput, NestoSelect, ConfirmDialog } from "@/components/polar";
import { Spinner } from "@/components/polar";
import { IngredintenTab } from "./tabs/IngredintenTab";
import { BereidingTab } from "./tabs/BereidingTab";
import { FinancieelTab } from "./tabs/FinancieelTab";
import { AllergenenTab } from "./tabs/AllergenenTab";
import { MethodesTab } from "./tabs/MethodesTab";
import { Archive } from "lucide-react";
import type { TabItem } from "@/components/polar";

const CATEGORIE_OPTIONS = [
  { value: "sauzen", label: "Sauzen" },
  { value: "bijgerechten", label: "Bijgerechten" },
  { value: "hoofdgerechten", label: "Hoofdgerechten" },
  { value: "desserts", label: "Desserts" },
  { value: "bases", label: "Bases" },
  { value: "marinades", label: "Marinades" },
  { value: "overig", label: "Overig" },
];

interface ReceptDetailPanelProps {
  receptId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ReceptDetailPanel({ receptId, open, onClose }: ReceptDetailPanelProps) {
  const { data: recept, isLoading } = useRecept(receptId);
  const { updateRecept, archiveRecept } = useReceptMutations();
  const [activeTab, setActiveTab] = React.useState("ingredienten");
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);

  // Reset tab when opening
  React.useEffect(() => {
    if (open) setActiveTab("ingredienten");
  }, [open, receptId]);

  const hasMethodes = recept?.halffabricaat_methodes && recept.halffabricaat_methodes.length > 0;

  const tabs: TabItem[] = [
    { id: "ingredienten", label: "Ingrediënten" },
    { id: "bereiding", label: "Bereiding" },
    { id: "financieel", label: "Financieel" },
    { id: "allergenen", label: "Allergenen" },
    ...(recept?.type === "halffabricaat"
      ? [{ id: "methodes", label: "Methodes" }]
      : []),
  ];

  const handleFieldSave = (field: string, value: unknown) => {
    if (!recept) return;
    updateRecept.mutate({ id: recept.id, [field]: value });
  };

  const handleArchive = () => {
    if (!recept) return;
    archiveRecept.mutate(recept.id, { onSuccess: onClose });
  };

  return (
    <>
      <NestoPanel
        open={open}
        onClose={onClose}
        title="Recept"
        width="w-[540px]"
      >
        {(titleRef) => {
          if (isLoading || !recept) {
            return (
              <div className="flex items-center justify-center h-64">
                <Spinner />
              </div>
            );
          }
          return (
            <div className="px-5 pb-5">
              {/* Basis info */}
              <ReceptBasisInfo
                recept={recept}
                titleRef={titleRef}
                onSave={handleFieldSave}
                hasMethodes={hasMethodes}
                onArchive={() => setShowArchiveConfirm(true)}
              />

              {/* Tabs */}
              <NestoTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                className="mt-4"
              />
              <NestoTabContent value="ingredienten" activeValue={activeTab}>
                <IngredintenTab recept={recept} />
              </NestoTabContent>
              <NestoTabContent value="bereiding" activeValue={activeTab}>
                <BereidingTab recept={recept} />
              </NestoTabContent>
              <NestoTabContent value="financieel" activeValue={activeTab}>
                <FinancieelTab recept={recept} />
              </NestoTabContent>
              <NestoTabContent value="allergenen" activeValue={activeTab}>
                <AllergenenTab recept={recept} />
              </NestoTabContent>
              {recept.type === "halffabricaat" && (
                <NestoTabContent value="methodes" activeValue={activeTab}>
                  <MethodesTab recept={recept} />
                </NestoTabContent>
              )}
            </div>
          );
        }}
      </NestoPanel>
      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Recept archiveren"
        description={`Weet je zeker dat je "${recept?.naam}" wilt archiveren?`}
        confirmLabel="Archiveren"
        variant="danger"
        onConfirm={handleArchive}
      />
    </>
  );
}

// ============================================================================
// ReceptBasisInfo (inline editable header)
// ============================================================================

interface ReceptBasisInfoProps {
  recept: ReceptDetail;
  titleRef: React.RefObject<HTMLHeadingElement>;
  onSave: (field: string, value: unknown) => void;
  hasMethodes: boolean | undefined;
  onArchive: () => void;
}

function ReceptBasisInfo({ recept, titleRef, onSave, hasMethodes, onArchive }: ReceptBasisInfoProps) {
  const [naam, setNaam] = React.useState(recept.naam);
  const [porties, setPorties] = React.useState(recept.porties);
  const [actief, setActief] = React.useState(recept.actieve_bereidingstijd ?? 0);
  const [passief, setPassief] = React.useState(recept.passieve_bereidingstijd ?? 0);

  React.useEffect(() => {
    setNaam(recept.naam);
    setPorties(recept.porties);
    setActief(recept.actieve_bereidingstijd ?? 0);
    setPassief(recept.passieve_bereidingstijd ?? 0);
  }, [recept]);

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <input
            ref={titleRef as React.RefObject<HTMLInputElement>}
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            onBlur={() => naam.trim() && naam !== recept.naam && onSave("naam", naam.trim())}
            className="text-lg font-semibold text-foreground bg-transparent border-none outline-none w-full p-0 focus:ring-0"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NestoBadge variant={recept.type === "halffabricaat" ? "primary" : "success"}>
            {recept.type === "halffabricaat" ? "Halffabricaat" : "Gerecht"}
          </NestoBadge>
          <NestoButton
            variant="ghost"
            size="icon"
            onClick={onArchive}
            className="text-muted-foreground"
          >
            <Archive className="h-4 w-4" />
          </NestoButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NestoSelect
          label="Categorie"
          value={recept.categorie}
          onValueChange={(v) => onSave("categorie", v)}
          options={CATEGORIE_OPTIONS}
          size="sm"
        />
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Porties</label>
          <NestoInput
            type="number"
            min={1}
            value={porties}
            onChange={(e) => setPorties(Number(e.target.value) || 1)}
            onBlur={() => porties !== recept.porties && onSave("porties", porties)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Actieve bereiding (min)</label>
          <NestoInput
            type="number"
            min={0}
            value={actief}
            onChange={(e) => setActief(Number(e.target.value))}
            onBlur={() => actief !== (recept.actieve_bereidingstijd ?? 0) && onSave("actieve_bereidingstijd", actief || null)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Passieve bereiding (min)</label>
          <NestoInput
            type="number"
            min={0}
            value={passief}
            onChange={(e) => setPassief(Number(e.target.value))}
            onBlur={() => passief !== (recept.passieve_bereidingstijd ?? 0) && onSave("passieve_bereidingstijd", passief || null)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
