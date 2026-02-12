import { useState } from "react";
import { Plus } from "lucide-react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoButton } from "@/components/polar/NestoButton";
import { PolicySetsSection } from "@/components/settings/tickets/PolicySetsSection";
import { PolicySetDetailSheet } from "@/components/settings/tickets/PolicySetDetailSheet";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";

export default function SettingsReserveringenBeleid() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const breadcrumbs = buildBreadcrumbs("reserveringen", "beleid");

  return (
    <>
      <SettingsDetailLayout
        title="Beleid"
        description="Beheer betalings- en annuleringsbeleid. Beleid kan aan meerdere tickets worden gekoppeld."
        breadcrumbs={breadcrumbs}
        actions={
          <NestoButton size="sm" onClick={() => setCreateSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nieuw beleid
          </NestoButton>
        }
      >
        {locationId && <PolicySetsSection locationId={locationId} />}
      </SettingsDetailLayout>

      {locationId && (
        <PolicySetDetailSheet
          open={createSheetOpen}
          onOpenChange={setCreateSheetOpen}
          locationId={locationId}
        />
      )}
    </>
  );
}
