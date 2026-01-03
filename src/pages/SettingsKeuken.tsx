import { useState } from "react";
import { SettingsPageLayout } from "@/components/polar/SettingsPageLayout";

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
          <div className="nesto-card-base p-6">
            <p className="text-muted-foreground">MEP defaults configuratie komt hier.</p>
          </div>
        </div>
      )}

      {activeSection === "labels-printen" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Labels & Printen</h2>
          <p className="text-sm text-muted-foreground">
            Beheer label templates en print instellingen.
          </p>
          <div className="nesto-card-base p-6">
            <p className="text-muted-foreground">Labels & printen configuratie komt hier.</p>
          </div>
        </div>
      )}

      {activeSection === "integraties" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Integraties</h2>
          <p className="text-sm text-muted-foreground">
            Koppel externe systemen aan de keuken module.
          </p>
          <div className="nesto-card-base p-6">
            <p className="text-muted-foreground">Integraties configuratie komt hier.</p>
          </div>
        </div>
      )}

      {activeSection === "inkoop" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inkoop</h2>
          <p className="text-sm text-muted-foreground">
            Instellingen voor inkoop en bestellingen.
          </p>
          <div className="nesto-card-base p-6">
            <p className="text-muted-foreground">Inkoop configuratie komt hier.</p>
          </div>
        </div>
      )}
    </SettingsPageLayout>
  );
}
