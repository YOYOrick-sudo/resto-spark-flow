import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  location_id: string;
  direction: string;
  content: string | null;
  message_type: string;
  channel: string;
  is_ai_generated: boolean | null;
  sent_by: string | null;
  wa_message_id: string | null;
  wa_status: string | null;
  template_name: string | null;
  created_at: string | null;
}

export function useConversationMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, currentUserId, locationId }: { content: string; currentUserId: string; locationId: string }) => {
      if (!conversationId) throw new Error('No conversation');
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        location_id: locationId,
        direction: 'outbound',
        content,
        message_type: 'text',
        channel: 'webchat',
        is_ai_generated: false,
        sent_by: currentUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
    },
  });

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return { messages, isLoading, sendMessage };
}
