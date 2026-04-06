
CREATE OR REPLACE FUNCTION public.has_unanswered_inbound(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT direction = 'inbound' 
     FROM messages 
     WHERE conversation_id = _conversation_id 
     ORDER BY created_at DESC 
     LIMIT 1),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.get_attention_conversations(p_location_id uuid)
RETURNS SETOF conversations
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.* FROM conversations c
  WHERE c.location_id = p_location_id
  AND (
    (c.status = 'escalated' AND public.has_unanswered_inbound(c.id))
    OR
    (c.handled_by = 'operator' AND c.unread_count > 0)
  )
  ORDER BY c.last_message_at ASC
  LIMIT 50
$$;
