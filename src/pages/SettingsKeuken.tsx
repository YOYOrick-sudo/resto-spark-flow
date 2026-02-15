import { useState } from "react";
import { SettingsPageLayout, EmptyState } from "@/components/polar";
import { ClipboardList, Printer, Plug, ShoppingCart } from "lucide-react";

const sections = [
  { id: "mep-defaults", label: "MEP defaults" },
  { id: "labels-printen", label: "Labels & Printen" },
  { id: "integraties", label: "Integraties" },
  { id: "inkoop", label: "Inkoop" },
];

export default function SettingsKeuken() {
  const [activeSection, setActiveSection] = useState("mep-defaults");

  return (
    <SettingsPageLayout
      module="Keuken"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {activeSection === "mep-defaults" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">MEP Defaults</h2>
          <p className="text-sm text-muted-foreground">
            Configureer standaard MEP taak instellingen.
          </p>
          <EmptyState
            icon={ClipboardList}
            title="MEP defaults configuratie"
            description="Deze instellingen worden binnenkort beschikbaar."
            size="sm"
          />
        </div>
      )}

      {activeSection === "labels-printen" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Labels & Printen</h2>
          <p className="text-sm text-muted-foreground">
            Beheer label templates en print instellingen.
          </p>
          <EmptyState
            icon={Printer}
            title="Labels & printen configuratie"
            description="Deze instellingen worden binnenkort beschikbaar."
            size="sm"
          />
        </div>
      )}

      {activeSection === "integraties" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Integraties</h2>
          <p className="text-sm text-muted-foreground">
            Koppel externe systemen aan de keuken module.
          </p>
          <EmptyState
            icon={Plug}
            title="Integraties configuratie"
            description="Deze instellingen worden binnenkort beschikbaar."
            size="sm"
          />
        </div>
      )}

      {activeSection === "inkoop" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inkoop</h2>
          <p className="text-sm text-muted-foreground">
            Instellingen voor inkoop en bestellingen.
          </p>
          <EmptyState
            icon={ShoppingCart}
            title="Inkoop configuratie"
            description="Deze instellingen worden binnenkort beschikbaar."
            size="sm"
          />
        </div>
      )}
    </SettingsPageLayout>
  );
}
