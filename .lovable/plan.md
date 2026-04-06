

# Fix: Berichtpreview + Gastprofiel laden bij selectie

## Probleem 1: "Geen berichten" preview
`useInboxConversations()` zet `lastMessage: null` hardcoded in `mapConversations` (regel 101). Er worden geen berichten opgehaald — in tegenstelling tot `useConversations()` die wél een batch fetch doet.

## Probleem 2: Gastprofiel toont "Selecteer een gesprek"
`ConversationList.onSelect()` geeft altijd `null` als customerId mee (regels 51, 71). De `conversations` tabel heeft een `customer_id` kolom, maar die wordt niet opgehaald in de query.

## Oplossing

### 1. `src/hooks/useConversations.ts` — `useInboxConversations`

**customer_id toevoegen aan beide queries:**
```sql
id, channel, status, handled_by, claimed_by, claimed_at,
unread_count, last_message_at, created_at, customer_id,
customer:customers(first_name, last_name, phone_number)
```

**Batch fetch last messages** (zelfde patroon als `useConversations`):
Na `mapConversations`, haal voor alle conversation IDs het laatste bericht op uit `messages` en vul `lastMessage` in.

**`ConversationItem` interface**: voeg `customer_id` toe.

### 2. `src/components/assistant/inbox/ConversationList.tsx`

Beide `onSelect` calls: geef `conv.customer_id` mee in plaats van `null`:
```tsx
onClick={() => onSelect(conv.id, conv.customer_id)}
```

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useConversations.ts` | Voeg `customer_id` toe aan select + interface. Batch fetch last messages in `useInboxConversations`. |
| `src/components/assistant/inbox/ConversationList.tsx` | Geef `conv.customer_id` mee aan `onSelect` |

