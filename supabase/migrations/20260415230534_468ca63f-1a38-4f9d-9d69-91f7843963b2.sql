CREATE OR REPLACE FUNCTION public.get_recent_inbox_conversations(p_location_id uuid)
RETURNS SETOF conversations
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.* FROM conversations c
  WHERE c.location_id = p_location_id
    AND c.handled_by = 'ai'
    AND c.status IN ('active', 'waiting')
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = c.id
        AND m.direction = 'inbound'
    )
  ORDER BY c.last_message_at DESC
  LIMIT 20
$$;