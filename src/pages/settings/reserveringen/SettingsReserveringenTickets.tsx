import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoButton } from "@/components/polar/NestoButton";
import { TicketsSection } from "@/components/settings/tickets";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useUserContext } from "@/contexts/UserContext";

export default function SettingsReserveringenTickets() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const navigate = useNavigate();

  const breadcrumbs = buildBreadcrumbs("reserveringen", "tickets");

  return (
    <SettingsDetailLayout
      title="Tickets"
      description="Beheer je reserveringsproducten. Elk ticket definieert wat gasten boeken."
      breadcrumbs={breadcrumbs}
      actions={
        <NestoButton onClick={() => navigate("/instellingen/reserveringen/tickets/nieuw")} disabled={!locationId}>
          <Plus className="h-4 w-4 mr-1" />
          Nieuw ticket
        </NestoButton>
      }
    >
      {locationId ? (
        <TicketsSection locationId={locationId} />
      ) : (
        <p className="text-sm text-muted-foreground">Geen locatie geselecteerd.</p>
      )}
    </SettingsDetailLayout>
  );
}
