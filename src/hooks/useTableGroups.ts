import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TableGroup, TableGroupMember } from "@/types/reservations";
import { nestoToast } from "@/lib/nestoToast";
import { queryKeys } from "@/lib/queryKeys";

interface UseTableGroupsOptions {
  includeInactive?: boolean;
  includeMembers?: boolean;
}

export function useTableGroups(
  locationId: string | undefined,
  options: UseTableGroupsOptions = {}
) {
  const { includeInactive = false, includeMembers = false } = options;

  return useQuery({
    queryKey: [...queryKeys.tableGroups(locationId!), includeInactive, includeMembers],
    queryFn: async (): Promise<TableGroup[]> => {
      if (!locationId) return [];

      // Build query based on options
      let query = supabase
        .from('table_groups')
        .select('*')
        .eq('location_id', locationId)
        .order('name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If members are needed, fetch them separately
      if (includeMembers && data && data.length > 0) {
        const groupIds = data.map(g => g.id);
        const { data: members } = await supabase
          .from('table_group_members')
          .select('*, tables(*)')
          .in('table_group_id', groupIds)
          .order('sort_order');

        // Map members to groups
        return data.map(group => ({
          ...group,
          members: members?.filter(m => m.table_group_id === group.id) ?? []
        })) as TableGroup[];
      }

      return (data as TableGroup[]) ?? [];
    },
    enabled: !!locationId
  });
}

// ============================================
// TABLE GROUP MUTATIONS
// ============================================

interface CreateTableGroupInput {
  location_id: string;
  name: string;
  notes?: string | null;
  is_online_bookable?: boolean;
  extra_seats?: number;
  table_ids?: string[];
}

export function useCreateTableGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ table_ids, extra_seats = 0, ...data }: CreateTableGroupInput) => {
      // Create group first
      const { data: group, error } = await supabase
        .from('table_groups')
        .insert({ ...data, extra_seats })
        .select()
        .single();

      if (error) throw error;
      
      // Add members if provided
      if (table_ids && table_ids.length > 0) {
        const members = table_ids.map((table_id, index) => ({
          table_group_id: group.id,
          table_id,
          sort_order: (index + 1) * 10
        }));
        
        const { error: memberError } = await supabase
          .from('table_group_members')
          .insert(members);
        
        if (memberError) throw memberError;
      }
      
      return group;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tableGroups(variables.location_id),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(variables.location_id),
        exact: false 
      });
      nestoToast.success('Tafelgroep aangemaakt');
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij aanmaken: ${error.message}`);
    }
  });
}

export function useUpdateTableGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TableGroup> & { id: string }) => {
      const { data: group, error } = await supabase
        .from('table_groups')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return group;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tableGroups(result.location_id),
        exact: false 
      });
    }
  });
}

interface ArchiveTableGroupParams {
  groupId: string;
  locationId: string;
}

export function useArchiveTableGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId }: ArchiveTableGroupParams) => {
      const { error } = await supabase
        .from('table_groups')
        .update({ is_active: false })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tableGroups(locationId),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false 
      });
      nestoToast.success('Tafelgroep gearchiveerd');
    }
  });
}

interface RestoreTableGroupParams {
  groupId: string;
  locationId: string;
}

export function useRestoreTableGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId }: RestoreTableGroupParams) => {
      const { error } = await supabase
        .from('table_groups')
        .update({ is_active: true })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tableGroups(locationId),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false 
      });
      nestoToast.success('Tafelgroep hersteld');
    }
  });
}

// ============================================
// TABLE GROUP MEMBER MUTATIONS
// ============================================

interface AddTableGroupMemberParams {
  table_group_id: string;
  table_id: string;
  sort_order?: number;
  locationId: string;
}

export function useAddTableGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, ...data }: AddTableGroupMemberParams) => {
      const { data: member, error } = await supabase
        .from('table_group_members')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tableGroups(locationId),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false 
      });
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij toevoegen: ${error.message}`);
    }
  });
}

interface RemoveTableGroupMemberParams {
  memberId: string;
  locationId: string;
}

export function useRemoveTableGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: RemoveTableGroupMemberParams) => {
      const { error } = await supabase
        .from('table_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tableGroups(locationId),
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.areasWithTables(locationId),
        exact: false 
      });
    }
  });
}

interface UpdateMemberSortOrderParams {
  id: string;
  sort_order: number;
  locationId: string;
}

export function useUpdateMemberSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sort_order }: UpdateMemberSortOrderParams) => {
      const { error } = await supabase
        .from('table_group_members')
        .update({ sort_order })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tableGroups(locationId),
        exact: false 
      });
    }
  });
}
