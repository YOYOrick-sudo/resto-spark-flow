import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoButton } from "@/components/polar/NestoButton";
import { PolicySetsSection } from "@/components/settings/tickets/PolicySetsSection";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { TitleHelp } from "@/components/polar/TitleHelp";

export default function SettingsReserveringenBeleid() {
  const navigate = useNavigate();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const breadcrumbs = buildBreadcrumbs("reserveringen", "beleid");

  return (
    <SettingsDetailLayout
      title={
        <span className="flex items-center gap-2">
          Beleid
          <TitleHelp title="Wat is beleid?">
            <p className="text-muted-foreground">Annulerings- en betalingsbeleid dat je aan tickets koppelt. Bepaal of gasten een aanbetaling doen.</p>
          </TitleHelp>
        </span>
      }
      description="Beheer betalings- en annuleringsbeleid. Beleid kan aan meerdere tickets worden gekoppeld."
      breadcrumbs={breadcrumbs}
      actions={
        <NestoButton
          size="sm"
          onClick={() => navigate("/instellingen/reserveringen/beleid/nieuw")}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nieuw beleid
        </NestoButton>
      }
    >
      {locationId && <PolicySetsSection locationId={locationId} />}
    </SettingsDetailLayout>
  );
}
