import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { AuditLogEntry } from '@/types/reservation';

export function useAuditLog(entityType: string, entityId: string | null) {
  return useQuery<AuditLogEntry[]>({
    queryKey: queryKeys.auditLog(entityType, entityId ?? ''),
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    enabled: !!entityId,
  });
}
