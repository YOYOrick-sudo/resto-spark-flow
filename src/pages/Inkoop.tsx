import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, NestoTabs, NestoTabContent, NestoButton, ModuleSubNav } from "@/components/polar";
import { KEUKEN_SUBNAV } from "@/lib/moduleSubNav";
import { BesteladviesTab } from "@/components/inkoop/BesteladviesTab";
import { BestellijstenTab } from "@/components/inkoop/BestellijstenTab";
import { OrderhistorieTab } from "@/components/inkoop/OrderhistorieTab";
import { FacturenTab } from "@/components/inkoop/FacturenTab";
import { Truck } from "lucide-react";

const tabs = [
  { id: "advies", label: "Besteladvies" },
  { id: "bestellijsten", label: "Bestellijsten" },
  { id: "facturen", label: "Facturen" },
  { id: "historie", label: "Orderhistorie" },
];

export default function Inkoop() {
  const [activeTab, setActiveTab] = useState("advies");
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voorraad & Inkoop"
        subtitle="Besteladvies, bestellingen, facturen en orderhistorie."
        actions={
          <NestoButton
            variant="outline"
            leftIcon={<Truck className="h-4 w-4" />}
            onClick={() => navigate("/inkoop/leveranciers")}
          >
            Leveranciers beheren
          </NestoButton>
        }
      />

      <ModuleSubNav items={KEUKEN_SUBNAV} />

      <NestoTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <NestoTabContent value="advies" activeValue={activeTab}>
        <BesteladviesTab onBestellingCreated={() => setActiveTab("bestellijsten")} />
      </NestoTabContent>

      <NestoTabContent value="bestellijsten" activeValue={activeTab}>
        <BestellijstenTab />
      </NestoTabContent>

      <NestoTabContent value="facturen" activeValue={activeTab}>
        <FacturenTab />
      </NestoTabContent>

      <NestoTabContent value="historie" activeValue={activeTab}>
        <OrderhistorieTab />
      </NestoTabContent>
    </div>
  );
}
