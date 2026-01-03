import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Area, Table, AreaWithTables } from "@/types/reservations";

interface UseAreasWithTablesOptions {
  /** Include archived areas/tables (default: false) */
  includeInactive?: boolean;
  /** Include group count per table (default: false, adds extra query) */
  includeGroupCounts?: boolean;
}

export function useAreasWithTables(
  locationId: string | undefined,
  options: UseAreasWithTablesOptions = {}
) {
  const { includeInactive = false, includeGroupCounts = false } = options;

  return useQuery({
    queryKey: ['areas-with-tables', locationId, includeInactive, includeGroupCounts],
    queryFn: async (): Promise<AreaWithTables[]> => {
      if (!locationId) return [];

      // Query 1: areas
      let areasQuery = supabase
        .from('areas')
        .select('*')
        .eq('location_id', locationId)
        .order('sort_order');

      if (!includeInactive) {
        areasQuery = areasQuery.eq('is_active', true);
      }
      
      const { data: areas, error: areasError } = await areasQuery;
      if (areasError) throw areasError;

      // Query 2: tables
      let tablesQuery = supabase
        .from('tables')
        .select('*')
        .eq('location_id', locationId)
        .order('sort_order');

      if (!includeInactive) {
        tablesQuery = tablesQuery.eq('is_active', true);
      }
      
      const { data: tables, error: tablesError } = await tablesQuery;
      if (tablesError) throw tablesError;

      // Bouw Set van table IDs voor filtering (respecteert includeInactive automatisch)
      const tableIds = new Set((tables as Table[]).map(t => t.id));

      // Query 3: group counts - ALLEEN ACTIEVE GROUPS + LOCATION SCOPE
      const countMap = new Map<string, number>();
      if (includeGroupCounts) {
        const { data: groupCounts, error: countsError } = await supabase
          .from('table_group_members')
          .select('table_id, table_groups!inner(is_active, location_id)')
          .eq('table_groups.is_active', true)
          .eq('table_groups.location_id', locationId);

        if (countsError) throw countsError;

        groupCounts?.forEach((m: { table_id: string }) => {
          // Skip tafels die niet in onze result set zitten
          if (!tableIds.has(m.table_id)) return;
          countMap.set(m.table_id, (countMap.get(m.table_id) || 0) + 1);
        });
      }

      // Pre-group tables by area_id voor O(1) lookup (behoudt sort_order van query)
      const tablesByArea = new Map<string, Table[]>();
      (tables as Table[])?.forEach(t => {
        const enrichedTable = {
          ...t,
          group_count: includeGroupCounts ? (countMap.get(t.id) || 0) : undefined
        };
        
        if (!tablesByArea.has(t.area_id)) {
          tablesByArea.set(t.area_id, []);
        }
        tablesByArea.get(t.area_id)!.push(enrichedTable);
      });

      // Map areas met O(1) table lookup
      return (areas as Area[])?.map(area => ({
        ...area,
        tables: tablesByArea.get(area.id) ?? []
      })) ?? [];
    },
    enabled: !!locationId
  });
}

// Convenience hook for Grid View (no group counts needed)
export function useAreasForGrid(locationId: string | undefined) {
  return useAreasWithTables(locationId, { includeInactive: false, includeGroupCounts: false });
}

// Convenience hook for Settings (with group counts)
export function useAreasForSettings(locationId: string | undefined, includeInactive = true) {
  return useAreasWithTables(locationId, { includeInactive, includeGroupCounts: true });
}
