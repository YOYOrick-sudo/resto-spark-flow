import { useMemo, useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts";
import { AreasSection } from "@/components/settings/tables";
import { SettingsInsightPanel, InsightItem, HealthCheck } from "@/components/settings/context";
import { NestoButton } from "@/components/polar/NestoButton";
import { useUserContext } from "@/contexts/UserContext";
import { useAreasForSettings } from "@/hooks/useAreasWithTables";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { Plus } from "lucide-react";

/**
 * Niveau 4: Areas list page
 */
export default function SettingsReserveringenTafelsAreas() {
  const { currentLocation } = useUserContext();
  const { data: areas, isLoading } = useAreasForSettings(currentLocation?.id, true);
  const breadcrumbs = buildBreadcrumbs("reserveringen", "tafels", "areas");
  const [addTrigger, setAddTrigger] = useState(0);
  const handleAddArea = () => setAddTrigger(t => t + 1);

  // Calculate aggregated stats
  const stats = useMemo(() => {
    if (!areas) return null;

    const activeAreas = areas.filter((a) => a.is_active);
    const inactiveAreas = areas.filter((a) => !a.is_active);
    
    let totalTables = 0;
    let totalSeats = 0;
    let archivedTables = 0;
    const emptyAreas: string[] = [];

    for (const area of activeAreas) {
      const activeTables = area.tables.filter((t) => t.is_active);
      const inactiveTables = area.tables.filter((t) => !t.is_active);
      
      totalTables += activeTables.length;
      archivedTables += inactiveTables.length;
      totalSeats += activeTables.reduce((sum, t) => sum + t.max_capacity, 0);
      
      if (activeTables.length === 0) {
        emptyAreas.push(area.name);
      }
    }

    return {
      activeAreaCount: activeAreas.length,
      inactiveAreaCount: inactiveAreas.length,
      totalTables,
      totalSeats,
      archivedTables,
      emptyAreas,
    };
  }, [areas]);

  // Build context panel data
  const insights: InsightItem[] = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Totaal areas", value: `${stats.activeAreaCount}` },
      { label: "Totaal tafels", value: `${stats.totalTables}` },
      { label: "Totaal stoelen", value: `${stats.totalSeats}` },
      { label: "Gearchiveerd", value: `${stats.archivedTables + stats.inactiveAreaCount}`, unit: "items" },
    ];
  }, [stats]);

  const checks: HealthCheck[] = useMemo(() => {
    if (!stats) return [];
    const result: HealthCheck[] = [];

    // Empty areas check
    if (stats.emptyAreas.length > 0) {
      for (const name of stats.emptyAreas) {
        result.push({
          status: "warning",
          message: `Area '${name}' heeft geen tafels. Voeg tafels toe of archiveer.`,
        });
      }
    } else if (stats.activeAreaCount > 0) {
      result.push({
        status: "ok",
        message: "Alle areas hebben tafels.",
      });
    }

    // Archived items check
    const archivedTotal = stats.archivedTables + stats.inactiveAreaCount;
    if (archivedTotal > 0) {
      result.push({
        status: "warning",
        message: "Gearchiveerde items aanwezig. Ruim op indien niet meer nodig.",
      });
    }

    return result;
  }, [stats]);

  const context = [
    `${stats?.activeAreaCount || 0} actieve areas met ${stats?.totalTables || 0} tafels.`,
    stats?.archivedTables ? `${stats.archivedTables} gearchiveerde tafels.` : "",
  ].filter(Boolean);

  return (
    <SettingsDetailLayout
      title="Areas"
      description="Beheer ruimtes en de tafels daarin."
      breadcrumbs={breadcrumbs}
      actions={
        <NestoButton onClick={handleAddArea} size="sm" disabled={!currentLocation?.id}>
          <Plus className="h-4 w-4 mr-1" />
          Nieuwe Area
        </NestoButton>
      }
      aside={
        !isLoading && stats ? (
          <SettingsInsightPanel insights={insights} checks={checks} context={context} />
        ) : undefined
      }
    >
      <div className="max-w-4xl">
        <AreasSection locationId={currentLocation?.id} externalAddTrigger={addTrigger} />
      </div>
    </SettingsDetailLayout>
  );
}
