import { SettingsSectionLayout } from "@/components/settings/layouts";
import { reserveringenConfig, getSectionConfig } from "@/lib/settingsRouteConfig";
import { useAreasForSettings } from "@/hooks/useAreasWithTables";
import { useTableGroups } from "@/hooks/useTableGroups";
import { useUserContext } from "@/contexts/UserContext";

/**
 * Niveau 3: Tafelbeheer section page
 * Shows subsection cards with counts
 */
export default function SettingsReserveringenTafels() {
  const { currentLocation } = useUserContext();
  const { data: areas } = useAreasForSettings(currentLocation?.id);
  const { data: groups } = useTableGroups(currentLocation?.id, { 
    includeInactive: false,
    includeMembers: false 
  });

  const section = getSectionConfig("reserveringen", "tafels")!;

  // Count active items for each subsection
  const counts: Record<string, number> = {
    areas: areas?.filter(a => a.is_active).length ?? 0,
    tafelgroepen: groups?.filter(g => g.is_active && !g.is_system_generated).length ?? 0,
  };

  return (
    <SettingsSectionLayout
      config={reserveringenConfig}
      section={section}
      counts={counts}
    />
  );
}
