import { useState } from "react";
import { Plus } from "lucide-react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoButton } from "@/components/polar/NestoButton";
import { TicketsSection } from "@/components/settings/tickets";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useUserContext } from "@/contexts/UserContext";

export default function SettingsReserveringenTickets() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const [addTrigger, setAddTrigger] = useState(0);

  const breadcrumbs = buildBreadcrumbs("reserveringen", "tickets");

  return (
    <SettingsDetailLayout
      title="Tickets"
      description="Beheer je reserveringsproducten. Elk ticket definieert wat gasten boeken."
      breadcrumbs={breadcrumbs}
      actions={
        <NestoButton onClick={() => setAddTrigger((t) => t + 1)} disabled={!locationId}>
          <Plus className="h-4 w-4 mr-1" />
          Nieuw ticket
        </NestoButton>
      }
    >
      {locationId ? (
        <TicketsSection locationId={locationId} externalAddTrigger={addTrigger} />
      ) : (
        <p className="text-sm text-muted-foreground">Geen locatie geselecteerd.</p>
      )}
    </SettingsDetailLayout>
  );
}
