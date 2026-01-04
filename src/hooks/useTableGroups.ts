import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TableGroup, TableGroupMember } from "@/types/reservations";
import { toast } from "sonner";

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
    queryKey: ['table-groups', locationId, includeInactive, includeMembers],
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
  table_ids?: string[];
}

export function useCreateTableGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ table_ids, ...data }: CreateTableGroupInput) => {
      // Create group first
      const { data: group, error } = await supabase
        .from('table_groups')
        .insert(data)
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success('Tafelgroep aangemaakt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij aanmaken: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
    }
  });
}

export function useArchiveTableGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('table_groups')
        .update({ is_active: false })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success('Tafelgroep gearchiveerd');
    }
  });
}

export function useRestoreTableGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('table_groups')
        .update({ is_active: true })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
      toast.success('Tafelgroep hersteld');
    }
  });
}

// ============================================
// TABLE GROUP MEMBER MUTATIONS
// ============================================

export function useAddTableGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Pick<TableGroupMember, 'table_group_id' | 'table_id'> & { sort_order?: number }) => {
      const { data: member, error } = await supabase
        .from('table_group_members')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
    },
    onError: (error: Error) => {
      toast.error(`Fout bij toevoegen: ${error.message}`);
    }
  });
}

export function useRemoveTableGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('table_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
      queryClient.invalidateQueries({ queryKey: ['areas-with-tables'] });
    }
  });
}

export function useUpdateMemberSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from('table_group_members')
        .update({ sort_order })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-groups'] });
    }
  });
}
