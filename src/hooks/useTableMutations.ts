import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { 
  Area, 
  Table, 
  AreaWithTables,
  ArchiveAreaResponse, 
  RestoreTableResponse 
} from "@/types/reservations";
import { nestoToast } from "@/lib/nestoToast";
import { queryKeys } from "@/lib/queryKeys";

// ============================================
// AREA MUTATIONS
// ============================================

export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Pick<Area, 'location_id' | 'name' | 'fill_order'> & { sort_order?: number }) => {
      const { data: area, error } = await supabase
        .from('areas')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return area;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(variables.location_id),
        exact: false 
      });
      nestoToast.success('Area aangemaakt');
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij aanmaken: ${error.message}`);
    }
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Area> & { id: string }) => {
      const { data: area, error } = await supabase
        .from('areas')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return area;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(result.location_id),
        exact: false 
      });
    }
  });
}

export function useArchiveArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (areaId: string) => {
      // First get the area to know the location_id
      const { data: areaData } = await supabase
        .from('areas')
        .select('location_id')
        .eq('id', areaId)
        .single();
      
      const { data, error } = await supabase.rpc('archive_area', { _area_id: areaId });
      if (error) throw error;
      return { result: data as unknown as ArchiveAreaResponse, locationId: areaData?.location_id };
    },
    onSuccess: ({ result, locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.areasWithTables(locationId),
          exact: false 
        });
      }
      if (result.archived_area) {
        nestoToast.success(`Area gearchiveerd met ${result.archived_tables} tafel(s)`);
      } else {
        nestoToast.info(result.message || 'Area was al gearchiveerd');
      }
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij archiveren: ${error.message}`);
    }
  });
}

export function useRestoreArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (areaId: string) => {
      // First get the area to know the location_id
      const { data: areaData } = await supabase
        .from('areas')
        .select('location_id')
        .eq('id', areaId)
        .single();
      
      const { error } = await supabase
        .from('areas')
        .update({ is_active: true })
        .eq('id', areaId);

      if (error) throw error;
      return areaData?.location_id;
    },
    onSuccess: (locationId) => {
      if (locationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.areasWithTables(locationId),
          exact: false 
        });
      }
      nestoToast.success('Area hersteld');
    }
  });
}

// ============================================
// TABLE MUTATIONS
// ============================================

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { area_id: string; table_number: number; min_capacity: number; max_capacity: number } & Partial<Omit<Table, 'id' | 'location_id' | 'created_at' | 'updated_at'>>) => {
      // Get location_id from area for cache invalidation
      const { data: areaData } = await supabase
        .from('areas')
        .select('location_id')
        .eq('id', data.area_id)
        .single();
      
      // Note: location_id is set automatically by database trigger from area_id
      const { data: table, error } = await supabase
        .from('tables')
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return { table, locationId: areaData?.location_id };
    },
    onSuccess: ({ locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.areasWithTables(locationId),
          exact: false 
        });
      }
      nestoToast.success('Tafel aangemaakt');
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij aanmaken: ${error.message}`);
    }
  });
}

export function useCreateTablesBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tables: Array<{ area_id: string; table_number: number; min_capacity: number; max_capacity: number }>) => {
      if (tables.length === 0) throw new Error('No tables to create');
      
      // Get location_id from first table's area
      const { data: areaData } = await supabase
        .from('areas')
        .select('location_id')
        .eq('id', tables[0].area_id)
        .single();
      
      // location_id is set by trigger from area_id
      const { data, error } = await supabase
        .from('tables')
        .insert(tables as any)
        .select();

      if (error) throw error;
      return { data, locationId: areaData?.location_id };
    },
    onSuccess: ({ data, locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.areasWithTables(locationId),
          exact: false 
        });
      }
      nestoToast.success(`${data.length} tafel(s) aangemaakt`);
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij aanmaken: ${error.message}`);
    }
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Table> & { id: string }) => {
      const { data: table, error } = await supabase
        .from('tables')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return table;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(result.location_id),
        exact: false 
      });
    }
  });
}

interface ArchiveTableParams {
  tableId: string;
  locationId: string;
}

export function useArchiveTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tableId }: ArchiveTableParams) => {
      const { error } = await supabase
        .from('tables')
        .update({ is_active: false })
        .eq('id', tableId);

      if (error) throw error;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false 
      });
      nestoToast.success('Tafel gearchiveerd');
    }
  });
}

interface RestoreTableParams {
  tableId: string;
  newLabel?: string;
}

export function useRestoreTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tableId, newLabel }: RestoreTableParams) => {
      // Get table's location for cache invalidation
      const { data: tableData } = await supabase
        .from('tables')
        .select('location_id')
        .eq('id', tableId)
        .single();
      
      const { data, error } = await supabase.rpc('restore_table', {
        _table_id: tableId,
        _new_display_label: newLabel ?? null
      });

      if (error) throw error;
      
      const result = data as unknown as RestoreTableResponse;
      
      // Throw specific errors for UI handling
      if (!result.restored) {
        const err = new Error(result.message || 'Restore failed');
        (err as Error & { code?: string }).code = result.error;
        throw err;
      }

      return { result, locationId: tableData?.location_id };
    },
    onSuccess: ({ result, locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.areasWithTables(locationId),
          exact: false 
        });
      }
      nestoToast.success(`Tafel "${result.display_label}" hersteld`);
    },
    onError: (error: Error & { code?: string }) => {
      // Don't show toast for label conflicts - let UI handle it
      if (error.code !== 'label_conflict') {
        nestoToast.error(`Fout bij herstellen: ${error.message}`);
      }
    }
  });
}

// ============================================
// SORT ORDER MUTATIONS (Atomic swaps via RPC)
// ============================================

interface SwapAreaSortOrderParams {
  areaAId: string;
  areaBId: string;
  locationId: string;
}

export function useSwapAreaSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ areaAId, areaBId }: SwapAreaSortOrderParams) => {
      const { error } = await supabase.rpc('swap_area_sort_order', {
        _area_a_id: areaAId,
        _area_b_id: areaBId
      });
      if (error) throw error;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false 
      });
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij herschikken: ${error.message}`);
    }
  });
}

interface SwapTableSortOrderParams {
  tableAId: string;
  tableBId: string;
  locationId: string;
}

export function useSwapTableSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tableAId, tableBId }: SwapTableSortOrderParams) => {
      const { error } = await supabase.rpc('swap_table_sort_order', {
        _table_a_id: tableAId,
        _table_b_id: tableBId
      });
      if (error) throw error;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false 
      });
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij herschikken: ${error.message}`);
    }
  });
}

// ============================================
// REORDER AREAS (Drag & Drop)
// ============================================

interface ReorderAreasParams {
  locationId: string;
  areaIds: string[];
}

interface ReorderAreasResult {
  success: boolean;
  changed: boolean;
  reason?: string;
  count?: number;
}

export function useReorderAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, areaIds }: ReorderAreasParams) => {
      const { data, error } = await supabase.rpc('reorder_areas', {
        _location_id: locationId,
        _area_ids: areaIds
      });
      if (error) throw error;
      return data as unknown as ReorderAreasResult;
    },

    onMutate: async ({ locationId, areaIds }) => {
      const baseKey = queryKeys.areasWithTables(locationId);

      // Cancel all in-flight queries for this location
      await queryClient.cancelQueries({ queryKey: baseKey, exact: false });

      // Get all query variants for this location
      const queries = queryClient.getQueriesData<AreaWithTables[]>({ queryKey: baseKey });
      const previousData = new Map(queries);

      // ID-based optimistic update across ALL variants
      queries.forEach(([key, data]) => {
        if (!data) return;

        const areaMap = new Map(data.map(a => [a.id, a]));
        const archived = data.filter(a => !a.is_active);

        // Rebuild active list from new order
        const newActive = areaIds
          .map(id => areaMap.get(id))
          .filter((a): a is AreaWithTables => !!a && a.is_active)
          .map((area, idx) => ({ ...area, sort_order: (idx + 1) * 10 }));

        queryClient.setQueryData(key, [...newActive, ...archived]);
      });

      return { previousData };
    },

    onError: (error: Error, variables, context) => {
      // Rollback all variants
      if (context?.previousData) {
        context.previousData.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
      }
      nestoToast.error("Herschikken mislukt", error.message);
    },

    onSettled: (_, __, { locationId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false
      });
    },
  });
}

// ============================================
// REORDER TABLES (Drag & Drop within Area)
// ============================================

interface ReorderTablesParams {
  areaId: string;
  locationId: string;
  tableIds: string[];
}

export function useReorderTables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ areaId, tableIds }: ReorderTablesParams) => {
      const { data, error } = await supabase.rpc('reorder_tables', {
        _area_id: areaId,
        _table_ids: tableIds
      });
      if (error) throw error;
      return data as unknown as ReorderAreasResult;
    },

    onMutate: async ({ areaId, locationId, tableIds }) => {
      const baseKey = queryKeys.areasWithTables(locationId);

      // Cancel all in-flight queries for this location
      await queryClient.cancelQueries({ queryKey: baseKey, exact: false });

      // Get all query variants for this location
      const queries = queryClient.getQueriesData<AreaWithTables[]>({ queryKey: baseKey });
      const previousData = new Map(queries);

      // ID-based optimistic update: reorder tables within target area
      queries.forEach(([key, data]) => {
        if (!data) return;

        const newData = data.map(area => {
          if (area.id !== areaId) return area;

          const tableMap = new Map(area.tables.map(t => [t.id, t]));
          const archived = area.tables.filter(t => !t.is_active);

          // Rebuild active list from new order
          const newActive = tableIds
            .map(id => tableMap.get(id))
            .filter((t): t is Table => !!t && t.is_active)
            .map((table, idx) => ({ ...table, sort_order: (idx + 1) * 10 }));

          return { ...area, tables: [...newActive, ...archived] };
        });

        queryClient.setQueryData(key, newData);
      });

      return { previousData };
    },

    onError: (error: Error, _, context) => {
      // Rollback all variants
      if (context?.previousData) {
        context.previousData.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
      }
      nestoToast.error("Herschikken mislukt", error.message);
    },

    onSettled: (_, __, { locationId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false
      });
    },
  });
}

// ============================================
// NEXT SORT ORDER HELPERS
// ============================================

export async function getNextAreaSortOrder(locationId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_next_area_sort_order', {
    _location_id: locationId
  });
  if (error) throw error;
  return data ?? 10;
}

export async function getNextTableSortOrder(areaId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_next_table_sort_order', {
    _area_id: areaId
  });
  if (error) throw error;
  return data ?? 10;
}
