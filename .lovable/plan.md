

# Plan: Berichten Tab — Timestamp & Filter Fixes

## Probleem

1. **Timestamps:** `last_message_at` wordt geüpdated door élke outbound message — inclusief automatische reminders, bevestigingen, en AI-antwoorden. Oude gesprekken bubbelen daardoor onterecht naar boven.

2. **Gesprekkenlijst:** De Recent-sectie toont conversations die alleen automatische outbound berichten bevatten (reminders/bevestigingen). Geen echte interactie = niet in inbox.

## Analyse — waar wordt `last_message_at` gezet?

| Locatie | Context | Probleem |
|---------|---------|----------|
| `send-message/index.ts` r.230-233 | Templates (reminders, bevestigingen) | ✗ Bumpt altijd |
| `ai-respond/index.ts` r.792-794 | AI conversatie-antwoord | ✓ Mag bumpen (reactie op echte vraag) |
| `whatsapp-webhook/index.ts` r.217 | Inbound WhatsApp bericht | ✓ Correct |
| `webchat-message/index.ts` r.115 | Inbound webchat bericht | ✓ Correct |

## Fix 1: Timestamp — `send-message/index.ts`

In de `logMessage` functie (r.229-233): **stop met bumpen van `last_message_at`** voor automatische template-berichten.

De `logMessage` functie wordt aangeroepen met `isAiGenerated` parameter. Template berichten (reminders, bevestigingen) zijn altijd `isAiGenerated = false` maar het zijn wél automatische berichten. De juiste guard is: **verwijder de `last_message_at` update uit `logMessage` helemaal.** 

Waarom? `send-message` verstuurt alleen outbound templates (reminders, bevestigingen, etc.). Echte conversatie-updates komen via `whatsapp-webhook` (inbound) en `ai-respond` (AI reply op echte vraag). Die zetten `last_message_at` al correct.

```typescript
// send-message/index.ts — logMessage functie
// VERWIJDER regels 229-233:
// await supabase
//   .from('conversations')
//   .update({ last_message_at: new Date().toISOString() })
//   .eq('id', conversationId);
```

**Optioneel verfijning voor `ai-respond`:** AI-antwoorden mogen bumpen want ze zijn een reactie op een inbound bericht — dit is correct gedrag. Geen wijziging nodig.

## Fix 2: Gesprekkenlijst filteren — `useConversations.ts`

De Recent-sectie query (r.58-77) moet alleen conversations tonen waar minstens één inbound bericht bestaat. 

**Aanpak:** Maak een RPC `get_recent_inbox_conversations` die een `EXISTS` subquery doet op messages met `direction = 'inbound'`.

### Nieuwe RPC (migratie):

```sql
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
```

### Wijzig `useConversations.ts` — Recent query (r.58-77):

```typescript
const { data: recent = [], isLoading: isLoadingRecent } = useQuery({
  queryKey: ['conversations-recent', locationId],
  queryFn: async () => {
    if (!locationId) return [];
    
    // Use RPC that filters on conversations with real inbound messages
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_recent_inbox_conversations', { p_location_id: locationId });
    if (rpcError) throw rpcError;
    
    const ids = (rpcData || []).map((c: any) => c.id);
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, channel, status, handled_by, claimed_by, claimed_at,
        unread_count, last_message_at, created_at, customer_id,
        customer:customers(first_name, last_name, phone_number)
      `)
      .in('id', ids)
      .order('last_message_at', { ascending: false });
    if (error) throw error;
    return fetchLastMessages(mapConversations(data));
  },
  enabled: !!locationId,
});
```

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/send-message/index.ts` | Verwijder `last_message_at` update in `logMessage` (r.229-233) |
| Migratie SQL | Nieuwe RPC `get_recent_inbox_conversations` |
| `src/hooks/useConversations.ts` | Recent query → RPC call i.p.v. directe query |

## Suggesties

### 1. Ongelezen teller per gesprek resetten bij openen
Nu blijft `unread_count` staan nadat je een gesprek opent in de inbox. Voeg een `markAsRead` call toe in `ChatView` die `unread_count` op 0 zet wanneer een gesprek wordt geopend. Dat voorkomt dat de "Aandacht" sectie een gesprek blijft tonen dat je al gelezen hebt.

### 2. Laatst verzonden bericht preview in de conversatielijst
De `lastMessage` preview in de lijst pakt nu het allerlaatste bericht — ook als dat een automatische reminder is. Wijzig `fetchLastMessages` zodat het het laatste *inbound* bericht toont als preview, of het laatste handmatige/AI-reply. Dan ziet de restaurateur direct wát de gast vroeg, niet de automatische bevestigingstekst.

