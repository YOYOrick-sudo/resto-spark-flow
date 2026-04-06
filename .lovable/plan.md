

# Fix: Gesprekken onterecht in "Aandacht"

## Probleem

Yorick Mulder's gesprek (`status = 'escalated'`, `unread_count = 0`) staat in "Aandacht", maar het laatste bericht is een uitgaand AI-antwoord — de escalatie was al opgelost. De status werd nooit teruggezet.

De huidige query `status.eq.escalated` pakt **alle** geëscaleerde gesprekken, ook als ze al afgehandeld zijn. Er ontbreekt een check of er daadwerkelijk een onbeantwoorde inbound vraag is.

## Oplossing

Verfijn de "Aandacht" query met een extra voorwaarde: een gesprek hoort alleen in Aandacht als er een **recente inbound** boodschap is die nog niet beantwoord is.

### Aanpak

**Stap 1: Database functie** — Maak een SQL-functie `has_unanswered_inbound(conversation_id)` die checkt of het laatste bericht in een gesprek `direction = 'inbound'` is (= gast wacht op antwoord).

```sql
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
```

**Stap 2: Database view of RPC** — Maak een RPC-functie `get_attention_conversations(p_location_id)` die alleen gesprekken retourneert waar:
- `status = 'escalated'` **EN** het laatste bericht inbound is (gast wacht), OF
- `handled_by = 'operator'` EN `unread_count > 0` (operator heeft overgenomen, gast heeft geschreven)

```sql
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
```

**Stap 3: `src/hooks/useConversations.ts`** — Vervang de directe `.or()` query door een `.rpc('get_attention_conversations', { p_location_id: locationId })` call. Daarna alsnog de customer relatie en last messages ophalen via de bestaande helper functies.

Alternatief (simpeler, geen RPC nodig): voeg in de client-side query een **post-fetch filter** toe. Na het ophalen van escalated conversations, filter die waar het laatste bericht outbound is:

```typescript
// In useInboxConversations, na fetchLastMessages:
const filtered = items.filter(item => {
  if (item.status === 'escalated') {
    // Check of laatste bericht inbound was (= gast wacht)
    // We hebben lastMessage maar niet direction...
  }
  return true;
});
```

**Gekozen aanpak: RPC-functie** — dit is betrouwbaarder omdat we `direction` van het laatste bericht nodig hebben, wat we niet in de huidige data hebben.

## Bestanden

| Bestand | Actie |
|---|---|
| Migratie | `has_unanswered_inbound()` + `get_attention_conversations()` functies |
| `src/hooks/useConversations.ts` | Attention query: gebruik RPC ipv directe `.or()` query, voeg customer join toe als aparte stap |

