

# Berichten tab — Simpele inbox zonder filters

## Wat verandert

De gesprekkenlijst wordt vereenvoudigd: geen filters, geen zoekbalk. Twee automatisch gesorteerde secties vervangen alles. De badge-logica wordt aangepast zodat alleen "Aandacht"-gesprekken meetellen.

## Nieuwe structuur

```text
┌──────────────────────┐
│  AANDACHT (2)        │  ← oranje/warning tint, alleen als items > 0
│  ⚠️ Piet Jansen  3m  │
│  ⚠️ Maria Schmidt 1u │
├──────────────────────┤
│  RECENT              │
│  💬 Jan de Vries  2m ✦│
│  🌐 Lisa v Dijk  3u ✦│
│  ...max 20           │
│  [Toon meer]         │
├──────────────────────┤
│  (lege staat)        │
│  ✦                   │
│  Geen actieve         │
│  gesprekken.          │
│  De assistent houdt   │
│  het in de gaten.     │
└──────────────────────┘
```

## Wijzigingen per bestand

### 1. `src/hooks/useConversations.ts`

Hook herschrijven met een nieuwe signature: `useInboxConversations()` die twee lijsten retourneert:

- **`attention`**: conversations waar `status = 'escalated'` OF (`handled_by = 'operator'` AND `unread_count > 0`). Gesorteerd op `last_message_at ASC` (langst wachtend bovenaan).
- **`recent`**: conversations waar `handled_by = 'ai'` AND `status IN ('active', 'waiting')`. Gesorteerd op `last_message_at DESC`. Limit 20.

Bestaande `useConversations` hook blijft intact (wordt elders gebruikt). Nieuwe hook ernaast.

Realtime subscription invalideert beide queries.

### 2. `src/components/assistant/inbox/ConversationList.tsx`

Volledig herschrijven:
- Verwijder zoekbalk, filters, filter-state
- Gebruik `useInboxConversations()` 
- Render twee secties:
  - **"Aandacht"** header met subtiele `bg-warning/5` achtergrond en count — alleen als `attention.length > 0`
  - **"Recent"** header — altijd zichtbaar
- ConversationRow aanpassen:
  - Aandacht-rij: ⚠️ icoon, wachttijd als duration ("3 min", "1 uur"), geen unread-stip
  - Recent-rij: kanaal-icoon (💬/🌐), ✦ sparkle bij "Assistent" label, muted styling
- Lege staat: gecentreerd ✦ met tekst "Geen actieve gesprekken. De assistent houdt het in de gaten."

### 3. `src/pages/Assistent.tsx`

Badge voor "Berichten" tab: tel alleen `attention.length` in plaats van totale `unread_count`. Gebruik de nieuwe `useInboxConversations` hook.

### 4. `src/hooks/useSignalCount.ts`

Geen wijziging — sidebar badge telt al escalaties + pending actions + errors, wat correct is.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useConversations.ts` | Nieuwe `useInboxConversations()` hook toevoegen (bestaande hook behouden) |
| `src/components/assistant/inbox/ConversationList.tsx` | Herschrijven: twee secties, geen filters/zoek |
| `src/pages/Assistent.tsx` | Badge = `attention.length` ipv totale unread |

