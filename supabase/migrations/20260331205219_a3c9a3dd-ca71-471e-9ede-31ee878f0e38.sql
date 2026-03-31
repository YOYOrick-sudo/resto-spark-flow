
-- Conversation cleanup cron: close expired WhatsApp conversations
SELECT cron.schedule(
  'cleanup-expired-conversations',
  '0 */4 * * *',
  $$
  UPDATE public.conversations
  SET status = 'closed', updated_at = NOW()
  WHERE channel = 'whatsapp'
    AND status = 'active'
    AND service_window_expires_at < NOW()
    AND last_message_at < NOW() - INTERVAL '24 hours'
  $$
);
