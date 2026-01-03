import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { 
  Area, 
  Table, 
  ArchiveAreaResponse, 
  RestoreTableResponse 
} from "@/types/reservations";
import { toast } from "sonner";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success('Area aangemaakt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
    }
  });
}

export function useArchiveArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (areaId: string) => {
      const { data, error } = await supabase.rpc('archive_area', { _area_id: areaId });
      if (error) throw error;
      return data as unknown as ArchiveAreaResponse;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      if (result.archived_area) {
        toast.success(`Area gearchiveerd met ${result.archived_tables} tafel(s)`);
      } else {
        toast.info(result.message || 'Area was al gearchiveerd');
      }
    },
    onError: (error: Error) => {
      toast.error(`Fout bij archiveren: ${error.message}`);
    }
  });
}

export function useRestoreArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (areaId: string) => {
      const { error } = await supabase
        .from('areas')
        .update({ is_active: true })
        .eq('id', areaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success('Area hersteld');
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
      // Note: location_id is set automatically by database trigger from area_id
      const { data: table, error } = await supabase
        .from('tables')
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success('Tafel aangemaakt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken: ${error.message}`);
    }
  });
}

export function useCreateTablesBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tables: Array<{ area_id: string; table_number: number; min_capacity: number; max_capacity: number }>) => {
      // location_id is set by trigger from area_id
      const { data, error } = await supabase
        .from('tables')
        .insert(tables as any)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success(`${data.length} tafel(s) aangemaakt`);
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
    }
  });
}

export function useArchiveTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase
        .from('tables')
        .update({ is_active: false })
        .eq('id', tableId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success('Tafel gearchiveerd');
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

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success(`Tafel "${result.display_label}" hersteld`);
    },
    onError: (error: Error & { code?: string }) => {
      // Don't show toast for label conflicts - let UI handle it
      if (error.code !== 'label_conflict') {
        toast.error(`Fout bij herstellen: ${error.message}`);
      }
    }
  });
}
