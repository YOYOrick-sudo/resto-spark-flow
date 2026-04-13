import { useState } from "react";
import { PageHeader, NestoTabs, NestoTabContent, NestoButton } from "@/components/polar";
import { BesteladviesTab } from "@/components/inkoop/BesteladviesTab";
import { BestellijstenTab } from "@/components/inkoop/BestellijstenTab";
import { OrderhistorieTab } from "@/components/inkoop/OrderhistorieTab";
import { WasteTab } from "@/components/inkoop/WasteTab";
import { LeveranciersModal } from "@/components/inkoop/LeveranciersModal";
import { Truck } from "lucide-react";

const tabs = [
  { id: "advies", label: "Besteladvies" },
  { id: "bestellijsten", label: "Bestellijsten" },
  { id: "historie", label: "Orderhistorie" },
  { id: "waste", label: "Waste" },
];

export default function Inkoop() {
  const [activeTab, setActiveTab] = useState("advies");
  const [leveranciersOpen, setLeveranciersOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voorraad & Inkoop"
        subtitle="Besteladvies, bestellingen, orderhistorie en waste registratie."
        actions={
          <NestoButton
            variant="outline"
            leftIcon={<Truck className="h-4 w-4" />}
            onClick={() => setLeveranciersOpen(true)}
          >
            Leveranciers beheren
          </NestoButton>
        }
      />

      <NestoTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <NestoTabContent value="advies" activeValue={activeTab}>
        <BesteladviesTab onBestellingCreated={() => setActiveTab("bestellijsten")} />
      </NestoTabContent>

      <NestoTabContent value="bestellijsten" activeValue={activeTab}>
        <BestellijstenTab />
      </NestoTabContent>

      <NestoTabContent value="historie" activeValue={activeTab}>
        <OrderhistorieTab />
      </NestoTabContent>

      <NestoTabContent value="waste" activeValue={activeTab}>
        <WasteTab />
      </NestoTabContent>

      <LeveranciersModal open={leveranciersOpen} onOpenChange={setLeveranciersOpen} />
    </div>
  );
}
