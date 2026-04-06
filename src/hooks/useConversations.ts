import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface ConversationItem {
  id: string;
  customer_id: string | null;
  channel: string;
  status: string | null;
  handled_by: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  unread_count: number | null;
  last_message_at: string | null;
  created_at: string | null;
  customer: {
    first_name: string;
    last_name: string;
    phone_number: string | null;
  } | null;
  lastMessage?: string | null;
}

export function useInboxConversations() {
  const { currentLocation } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;

  const { data: attention = [], isLoading: isLoadingAttention } = useQuery({
    queryKey: ['conversations-attention', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, channel, status, handled_by, claimed_by, claimed_at,
          unread_count, last_message_at, created_at, customer_id,
          customer:customers(first_name, last_name, phone_number)
        `)
        .eq('location_id', locationId)
        .or('status.eq.escalated,and(handled_by.eq.operator,unread_count.gt.0)')
        .order('last_message_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return fetchLastMessages(mapConversations(data));
    },
    enabled: !!locationId,
  });

  const { data: recent = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ['conversations-recent', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, channel, status, handled_by, claimed_by, claimed_at,
          unread_count, last_message_at, created_at,
          customer:customers(first_name, last_name, phone_number)
        `)
        .eq('location_id', locationId)
        .eq('handled_by', 'ai')
        .in('status', ['active', 'waiting'])
        .order('last_message_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return mapConversations(data);
    },
    enabled: !!locationId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!locationId) return;
    const channel = supabase
      .channel(`inbox-conversations:${locationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `location_id=eq.${locationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations-attention', locationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations-recent', locationId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [locationId, queryClient]);

  return {
    attention,
    recent,
    isLoading: isLoadingAttention || isLoadingRecent,
  };
}

function mapConversations(data: any[]): ConversationItem[] {
  return (data || []).map((c: any) => ({
    ...c,
    customer: c.customer?.[0] || c.customer || null,
    lastMessage: null,
  }));
}

export function useConversations(filter: 'all' | 'active' | 'escalated' | 'closed' = 'all') {
  const { currentLocation } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', locationId, filter],
    queryFn: async () => {
      if (!locationId) return [];

      let query = supabase
        .from('conversations')
        .select(`
          id, channel, status, handled_by, claimed_by, claimed_at,
          unread_count, last_message_at, created_at,
          customer:customers(first_name, last_name, phone_number)
        `)
        .eq('location_id', locationId)
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (filter === 'active') {
        query = query.in('status', ['active', 'waiting']);
      } else if (filter === 'escalated') {
        query = query.eq('handled_by', 'operator');
      } else if (filter === 'closed') {
        query = query.eq('status', 'closed');
      } else {
        query = query.neq('status', 'closed');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch last message for each conversation
      const items: ConversationItem[] = (data || []).map((c: any) => ({
        ...c,
        customer: c.customer?.[0] || c.customer || null,
        lastMessage: null,
      }));

      // Batch fetch last messages
      if (items.length > 0) {
        const ids = items.map((c) => c.id);
        const { data: messages } = await supabase
          .from('messages')
          .select('conversation_id, content')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false });

        if (messages) {
          const lastMsgMap = new Map<string, string>();
          for (const m of messages) {
            if (!lastMsgMap.has(m.conversation_id)) {
              lastMsgMap.set(m.conversation_id, m.content || '');
            }
          }
          for (const item of items) {
            item.lastMessage = lastMsgMap.get(item.id) || null;
          }
        }
      }

      return items;
    },
    enabled: !!locationId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!locationId) return;
    const channel = supabase
      .channel(`conversations:${locationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `location_id=eq.${locationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations', locationId] });
        queryClient.invalidateQueries({ queryKey: ['unread-messages', locationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [locationId, queryClient]);

  return { conversations, isLoading };
}
